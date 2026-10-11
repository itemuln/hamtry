#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ $# -eq 1 ]] || { echo "Usage: $0 <hostname>" >&2; exit 1; }
server_name=$1
[[ "$server_name" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ && "$server_name" == *.* && "$server_name" != *..* ]] || { echo "Invalid DNS hostname." >&2; exit 1; }
for command in java docker nginx openssl; do
  command -v "$command" >/dev/null || { echo "Install $command first." >&2; exit 1; }
done
/opt/hamtry/runtime/node/bin/node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'
id hamtry >/dev/null 2>&1 || useradd --system --home-dir /var/lib/hamtry --create-home --shell /usr/sbin/nologin hamtry
install -d -m 0755 /opt/hamtry/{frontend,backend}/releases /opt/hamtry/operations /var/www/certbot
install -d -m 0750 -o hamtry -g hamtry /var/lib/hamtry/theme
install -d -m 0750 -o root -g hamtry /etc/hamtry
if [[ ! -f /etc/hamtry/hamtry.env ]]; then
  umask 0077
  password=$(openssl rand -hex 32)
  cat > /etc/hamtry/hamtry.env <<EOF
POSTGRES_DB=hamtry
POSTGRES_USER=hamtry
POSTGRES_PASSWORD=$password
HAMTRY_POSTGRES_HOST_PORT=5435
SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5435/hamtry
SPRING_DATASOURCE_USERNAME=hamtry
SPRING_DATASOURCE_PASSWORD=$password
SPRING_PROFILES_ACTIVE=production
SERVER_PORT=8082
HOST=127.0.0.1
PORT=4173
HAMTRY_THEME_FILE=/var/lib/hamtry/theme/hamtry-theme.json
APP_PUBLIC_URL=https://$server_name
EOF
  chown root:hamtry /etc/hamtry/hamtry.env
  chmod 0640 /etc/hamtry/hamtry.env
fi
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
install -m 0644 "$script_directory/postgres.compose.yaml" /opt/hamtry/operations/postgres.compose.yaml
install -m 0644 "$script_directory/hamtry-backend.service" "$script_directory/hamtry-frontend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable hamtry-backend hamtry-frontend
echo "Prepared Hamtry. Confirm ports 8082, 4173, 5435 are unused before starting services."
