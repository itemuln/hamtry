#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <github-actions-ssh-public-key-file>" >&2
  exit 1
fi

public_key_file=$1
if [[ ! -f "$public_key_file" || -L "$public_key_file" ]]; then
  echo "The SSH public key must be a regular file." >&2
  exit 1
fi

if [[ $(wc -l < "$public_key_file") -ne 1 ]] \
  || ! grep -Eq '^(ssh-ed25519|sk-ssh-ed25519) [A-Za-z0-9+/=]+( .*)?$' "$public_key_file"; then
  echo "Provide exactly one Ed25519 SSH public key." >&2
  exit 1
fi

deploy_user=hamtry-deploy
deploy_home=/var/lib/hamtry-deploy
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --system \
    --home-dir "$deploy_home" \
    --create-home \
    --shell /bin/bash \
    "$deploy_user"
fi

install -d -o "$deploy_user" -g "$deploy_user" -m 0750 "$deploy_home"
install -d -o "$deploy_user" -g "$deploy_user" -m 0700 "${deploy_home}/.ssh"
install -d -o "$deploy_user" -g "$deploy_user" -m 0700 "${deploy_home}/incoming"

authorized_keys_file=$(mktemp "${deploy_home}/.ssh/.authorized_keys.XXXXXX")
sudoers_file=$(mktemp /etc/sudoers.d/.hamtry-deploy.XXXXXX)
trap 'rm -f "$authorized_keys_file" "$sudoers_file"' EXIT

printf 'restrict %s\n' "$(<"$public_key_file")" > "$authorized_keys_file"
chown "$deploy_user:$deploy_user" "$authorized_keys_file"
chmod 0600 "$authorized_keys_file"
mv "$authorized_keys_file" "${deploy_home}/.ssh/authorized_keys"

install -o root -g root -m 0755 \
  "${script_directory}/deploy-release.sh" \
  /usr/local/sbin/hamtry-deploy

printf '%s\n' \
  'hamtry-deploy ALL=(root) NOPASSWD: /usr/local/sbin/hamtry-deploy *' \
  > "$sudoers_file"
chmod 0440 "$sudoers_file"
visudo -cf "$sudoers_file" >/dev/null
mv "$sudoers_file" /etc/sudoers.d/hamtry-deploy
trap - EXIT

# Preserve existing allowlists; add this account only when a list already exists.
ssh_configuration=/etc/ssh/sshd_config.d/65-hamtry-deploy.conf
ssh_temporary=$(mktemp)
trap 'rm -f "$ssh_temporary"' EXIT
if sshd -T | awk '$1 == "allowusers" { found = 1 } END { exit !found }'; then
  printf 'AllowUsers hamtry-deploy\n' > "$ssh_temporary"
fi
cat >> "$ssh_temporary" <<'EOF'
Match User hamtry-deploy
  PasswordAuthentication no
  KbdInteractiveAuthentication no
  AuthenticationMethods publickey
  AllowTcpForwarding no
  X11Forwarding no
  PermitTTY no
Match all
EOF
if [[ -f "$ssh_configuration" ]]; then
  cp -- "$ssh_configuration" "${ssh_configuration}.previous"
fi
install -o root -g root -m 0644 "$ssh_temporary" "$ssh_configuration"
if ! sshd -t; then
  if [[ -f "${ssh_configuration}.previous" ]]; then
    mv -- "${ssh_configuration}.previous" "$ssh_configuration"
  else
    rm -f -- "$ssh_configuration"
  fi
  echo "SSH configuration validation failed; prior configuration restored." >&2
  exit 1
fi
systemctl reload ssh
rm -f -- "$ssh_temporary"
trap - EXIT

echo "GitHub Actions deployment access is installed for ${deploy_user}."
