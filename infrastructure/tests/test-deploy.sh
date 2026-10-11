#!/usr/bin/env bash
# Run only inside a disposable Linux container as root; uses fixed production paths.
set -euo pipefail
[[ -f /.dockerenv && $EUID -eq 0 ]] || { echo "Requires a disposable Docker container." >&2; exit 1; }
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../production" && pwd)
useradd --system hamtry
mkdir -p /opt/hamtry/{frontend,backend}/releases /opt/hamtry/operations /var/lib/hamtry/theme /etc/hamtry /tmp/mocks
cat >/etc/hamtry/hamtry.env <<EOF
SERVER_PORT=8082
PORT=4173
APP_PUBLIC_URL=https://hamtry.example.com
EOF
cat >/tmp/mocks/systemctl <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >> /tmp/service-actions
exit 0
EOF
cat >/tmp/mocks/curl <<'EOF'
#!/bin/bash
url=${!#}
if [[ -f /tmp/fail-backend && "$url" == */actuator/health ]]; then exit 22; fi
if [[ -f /tmp/fail-frontend && "$(readlink /opt/hamtry/frontend/current)" == releases/b* && "$url" != */actuator/health ]]; then exit 22; fi
printf '{"status":"UP"}\n'
EOF
printf '#!/bin/bash\nexit 0\n' >/tmp/mocks/nginx
printf '#!/bin/bash\nexit 0\n' >/tmp/mocks/sleep
chmod +x /tmp/mocks/*
export PATH="/tmp/mocks:$PATH"
first=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
second=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
third=cccccccccccccccccccccccccccccccccccccccc
make_release() {
  local sha=$1
  local incoming="/var/lib/hamtry-deploy/incoming/$sha"
  mkdir -p "$incoming" /tmp/site/dist
  echo '<html>Hamtry</html>' >/tmp/site/dist/index.html
  tar -C /tmp/site -czf "$incoming/frontend.tar.gz" .
  echo jar >"$incoming/hamtry-backend.jar"
  echo '{"base":{},"tablet":{},"mobile":{}}' >"$incoming/theme-seed.json"
  (cd "$incoming"; sha256sum frontend.tar.gz hamtry-backend.jar theme-seed.json >SHA256SUMS)
}
make_release "$first"
touch /tmp/fail-backend
if bash "$script_directory/deploy-release.sh" "$first"; then echo "Expected first deployment failure" >&2; exit 1; fi
[[ ! -L /opt/hamtry/frontend/current && ! -L /opt/hamtry/backend/current ]]
[[ ! -d "/opt/hamtry/backend/releases/$first" ]]
rm /tmp/fail-backend
bash "$script_directory/deploy-release.sh" "$first"
[[ "$(readlink /opt/hamtry/frontend/current)" == "releases/$first" ]]
echo 'preserved saved theme' >/var/lib/hamtry/theme/hamtry-theme.json
make_release "$first"
bash "$script_directory/deploy-release.sh" "$first"
make_release "$second"
touch /tmp/fail-frontend
if bash "$script_directory/deploy-release.sh" "$second"; then echo "Expected frontend failure" >&2; exit 1; fi
[[ "$(readlink /opt/hamtry/frontend/current)" == "releases/$first" ]]
[[ "$(readlink /opt/hamtry/backend/current)" == "releases/$first" ]]
[[ ! -d "/opt/hamtry/frontend/releases/$second" ]]
[[ "$(cat /var/lib/hamtry/theme/hamtry-theme.json)" == 'preserved saved theme' ]]
rm /tmp/fail-frontend
bash "$script_directory/deploy-release.sh" "$second"
make_release "$third"
echo corrupt >>"/var/lib/hamtry-deploy/incoming/$third/hamtry-backend.jar"
if bash "$script_directory/deploy-release.sh" "$third"; then echo "Accepted corrupt checksum" >&2; exit 1; fi
[[ "$(readlink /opt/hamtry/backend/current)" == "releases/$second" ]]
make_release "$third"
ln -s /etc/passwd /tmp/site/dist/unsafe
incoming="/var/lib/hamtry-deploy/incoming/$third"
tar -C /tmp/site -czf "$incoming/frontend.tar.gz" .
(cd "$incoming"; sha256sum frontend.tar.gz hamtry-backend.jar theme-seed.json >SHA256SUMS)
if bash "$script_directory/deploy-release.sh" "$third"; then echo "Accepted archive symlink" >&2; exit 1; fi
[[ "$(readlink /opt/hamtry/backend/current)" == "releases/$second" ]]
[[ -z "$(find /opt/hamtry/operations -name '.release.*' -print)" ]]
echo 'PASS: first release, repeat, backend/frontend rollback, theme persistence, checksums, archive symlinks.'
