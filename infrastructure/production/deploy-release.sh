#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this deployment command through sudo." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <40-character-git-commit>" >&2
  exit 1
fi

release_id=$1
if [[ ! "$release_id" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release ID must be a full lowercase Git commit SHA." >&2
  exit 1
fi

incoming_source="/var/lib/hamtry-deploy/incoming/${release_id}"
incoming_directory=$(mktemp -d /opt/hamtry/operations/.release.XXXXXX)
trap 'rm -rf -- "$incoming_directory"' EXIT
for artifact in frontend.tar.gz hamtry-backend.jar theme-seed.json SHA256SUMS; do
  cp --no-dereference -- "$incoming_source/$artifact" "$incoming_directory/$artifact"
done
frontend_release="/opt/hamtry/frontend/releases/${release_id}"
backend_release="/opt/hamtry/backend/releases/${release_id}"
frontend_current=/opt/hamtry/frontend/current
backend_current=/opt/hamtry/backend/current
environment_file=/etc/hamtry/hamtry.env
exec 9>/run/lock/hamtry-deploy.lock
flock -n 9 || { echo "Another Hamtry deployment is running." >&2; exit 1; }
frontend_port=$(sed -n 's/^PORT=//p' "$environment_file" | tail -n 1)
if [[ ! "$frontend_port" =~ ^[0-9]+$ ]] || (( frontend_port < 1024 || frontend_port > 65535 )); then
  echo "PORT must be an unprivileged TCP port." >&2
  exit 1
fi

for required_command in curl find nginx sha256sum systemctl tar flock; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required deployment command is missing: ${required_command}" >&2
    exit 1
  fi
done

backend_port=$(sed -n 's/^SERVER_PORT=//p' "$environment_file" | tail -n 1)
if [[ ! "$backend_port" =~ ^[0-9]+$ ]] || (( backend_port < 1024 || backend_port > 65535 )); then
  echo "SERVER_PORT in ${environment_file} must be an unprivileged TCP port." >&2
  exit 1
fi

for artifact in frontend.tar.gz hamtry-backend.jar theme-seed.json SHA256SUMS; do
  artifact_path="${incoming_directory}/${artifact}"
  if [[ ! -f "$artifact_path" || -L "$artifact_path" ]]; then
    echo "Missing regular deployment artifact: ${artifact_path}" >&2
    exit 1
  fi
done

manifest_files=$(awk '{print $2}' "${incoming_directory}/SHA256SUMS" | LC_ALL=C sort)
if [[ "$manifest_files" != $'frontend.tar.gz\nhamtry-backend.jar\ntheme-seed.json' ]]; then
  echo "SHA256SUMS must contain exactly the three expected release artifacts." >&2
  exit 1
fi
(
  cd "$incoming_directory"
  sha256sum --check --strict SHA256SUMS
)

if tar -tzf "${incoming_directory}/frontend.tar.gz" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Frontend archive contains an unsafe path." >&2
  exit 1
fi
if tar -tvzf "${incoming_directory}/frontend.tar.gz" \
  | awk '{ entry_type = substr($1, 1, 1); if (entry_type != "d" && entry_type != "-") exit 1 }'; then
  :
else
  echo "Frontend archive may contain only regular files and directories." >&2
  exit 1
fi

current_frontend_target=$(readlink "$frontend_current" 2>/dev/null || true)
current_backend_target=$(readlink "$backend_current" 2>/dev/null || true)
current_frontend_valid=false
current_backend_valid=false
if [[ -n "$current_frontend_target" && -d "$frontend_current" ]]; then
  current_frontend_valid=true
fi
if [[ -n "$current_backend_target" && -d "$backend_current" ]]; then
  current_backend_valid=true
fi
if [[ "$current_frontend_valid" != "$current_backend_valid" ]]; then
  echo "Frontend and backend current links must either both be valid or both be absent." >&2
  exit 1
fi
if [[ ( -e "$frontend_current" || -L "$frontend_current" ) && "$current_frontend_valid" != true ]] \
  || [[ ( -e "$backend_current" || -L "$backend_current" ) && "$current_backend_valid" != true ]]; then
  echo "A current release path exists but is not a valid release link." >&2
  exit 1
fi

if [[ "$(readlink -f "$frontend_current" 2>/dev/null || true)" == "$frontend_release" \
  && "$(readlink -f "$backend_current" 2>/dev/null || true)" == "$backend_release" ]]; then
  echo "Release ${release_id} is already active."
  rm -rf -- "$incoming_directory" "$incoming_source"
  exit 0
fi

if [[ -e "$frontend_release" || -e "$backend_release" ]]; then
  echo "Release ${release_id} already exists but is not fully active." >&2
  exit 1
fi

frontend_switched=false
backend_switched=false
deployment_complete=false

wait_for_frontend_health() {
  for _ in {1..30}; do
    if systemctl is-active --quiet hamtry-frontend \
      && curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${frontend_port}/" >/dev/null \
      && curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${frontend_port}/api/theme" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_backend_health() {

  for _ in {1..30}; do
    if systemctl is-active --quiet hamtry-backend \
      && curl --fail --silent --show-error --max-time 5 \
        "http://127.0.0.1:${backend_port}/actuator/health" | grep -q '"status":"UP"'; then
      return 0
    fi
    sleep 2
  done

  return 1
}

switch_release_link() {
  local link_path=$1
  local link_target=$2
  local temporary_link="${link_path}.next-${release_id}"

  rm -f -- "$temporary_link"
  ln -s "$link_target" "$temporary_link"
  mv -Tf "$temporary_link" "$link_path"
}

rollback_release() {
  local exit_status=$?
  trap - EXIT

  if [[ "$deployment_complete" != true ]]; then
    echo "Deployment failed; restoring the previous release." >&2

    if [[ "$frontend_switched" == true ]]; then
      if [[ -n "$current_frontend_target" ]]; then
        switch_release_link "$frontend_current" "$current_frontend_target"
        if ! systemctl restart hamtry-frontend || ! wait_for_frontend_health; then
          echo "CRITICAL: restored frontend did not become healthy." >&2
        fi
      else
        systemctl stop hamtry-frontend || true
        rm -f -- "$frontend_current"
      fi
    fi

    if [[ "$backend_switched" == true ]]; then
      if [[ -n "$current_backend_target" ]]; then
        switch_release_link "$backend_current" "$current_backend_target"
        if ! systemctl restart hamtry-backend || ! wait_for_backend_health; then
          echo "CRITICAL: the restored backend release did not become healthy." >&2
          journalctl -u hamtry-backend --no-pager -n 80 >&2 || true
        fi
      else
        systemctl stop hamtry-backend || true
        rm -f -- "$backend_current"
      fi
    fi

    if [[ "$(readlink -f "$frontend_current" 2>/dev/null || true)" != "$frontend_release" ]]; then
      rm -rf -- "$frontend_release"
    fi
    if [[ "$(readlink -f "$backend_current" 2>/dev/null || true)" != "$backend_release" ]]; then
      rm -rf -- "$backend_release"
    fi
  fi

  rm -rf -- "$incoming_directory"
  exit "$exit_status"
}
trap rollback_release EXIT

install -d -m 0755 "$frontend_release" "$backend_release"
tar --extract --gzip \
  --file "${incoming_directory}/frontend.tar.gz" \
  --directory "$frontend_release" \
  --no-same-owner \
  --no-same-permissions
install -o root -g root -m 0644 \
  "${incoming_directory}/hamtry-backend.jar" \
  "${backend_release}/hamtry-backend.jar"

if [[ ! -f "${frontend_release}/dist/index.html" ]]; then
  echo "Frontend release does not contain index.html." >&2
  exit 1
fi
find "$frontend_release" -type d -exec chmod 0755 {} +
find "$frontend_release" -type f -exec chmod 0644 {} +
chown -R root:root "$frontend_release" "$backend_release"

if [[ ! -f /var/lib/hamtry/theme/hamtry-theme.json ]]; then
  install -o hamtry -g hamtry -m 0640 "$incoming_directory/theme-seed.json" /var/lib/hamtry/theme/hamtry-theme.json
fi

switch_release_link "$backend_current" "releases/${release_id}"
backend_switched=true
systemctl restart hamtry-backend

if ! wait_for_backend_health; then
  echo "The new backend did not become healthy." >&2
  journalctl -u hamtry-backend --no-pager -n 80 >&2 || true
  exit 1
fi

switch_release_link "$frontend_current" "releases/${release_id}"
frontend_switched=true
systemctl restart hamtry-frontend
if ! wait_for_frontend_health; then
  echo "The new frontend did not become healthy." >&2
  exit 1
fi
nginx -t

public_url=$(sed -n 's/^APP_PUBLIC_URL=//p' "$environment_file" | tail -n 1)
if [[ ! "$public_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "APP_PUBLIC_URL must be a path-free HTTPS origin for deployment verification." >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-all-errors \
  "${public_url}/" >/dev/null
curl --fail --silent --show-error --max-time 15 \
  --retry 5 --retry-delay 2 --retry-all-errors \
  "${public_url}/actuator/health" >/dev/null

deployment_complete=true
rm -rf -- "$incoming_directory" "$incoming_source"
trap - EXIT
echo "Release ${release_id} is active and healthy."
