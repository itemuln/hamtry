#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run this installer with sudo." >&2; exit 1; }
[[ $# -eq 1 ]] || { echo "Usage: $0 <liveness-source-directory>" >&2; exit 1; }
source_directory=$(realpath "$1")
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
for file in app.py requirements.txt; do
  [[ -f "$source_directory/$file" ]] || { echo "Missing ML source: $file" >&2; exit 1; }
done
id hamtry >/dev/null
for command in python3 nginx curl systemctl; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }
done
nginx_config=/etc/nginx/sites-available/hamtry
[[ -f "$nginx_config" && ! -L "$nginx_config" ]] || { echo "Expected the Hamtry NGINX site." >&2; exit 1; }
if ! systemctl is-active --quiet hamtry-liveness && ss -ltnH 'sport = :8001' | read -r _; then
  echo "Port 8001 is already in use by another service." >&2
  exit 1
fi

# Зөвхөн Hamtry-ийн ML хавтас, service болон NGINX location-ийг бэлдэнэ.
install -d -m 0755 /opt/hamtry/ml /opt/hamtry/operations
install -d -o hamtry -g hamtry -m 0700 /var/lib/hamtry/liveness
install -o root -g root -m 0644 "$source_directory/app.py" "$source_directory/requirements.txt" /opt/hamtry/ml/
if ! python3 -c 'import ensurepip' 2>/dev/null; then
  apt-get update
  apt-get install -y python3-venv
fi
python3 -m venv /opt/hamtry/ml/.venv
/opt/hamtry/ml/.venv/bin/python -m pip install --requirement /opt/hamtry/ml/requirements.txt
install -o root -g root -m 0644 "$script_directory/hamtry-liveness.service" /etc/systemd/system/hamtry-liveness.service
systemctl daemon-reload
systemctl enable hamtry-liveness
systemctl restart hamtry-liveness

echo "Waiting for the models to load; the first start downloads model weights."
ready=false
for _ in {1..300}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:8001/api/liveness/health | grep -q '"status":"ready"'; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  journalctl -u hamtry-liveness --no-pager -n 60
  echo "ML startup failed; the public NGINX configuration was not changed." >&2
  exit 1
fi

backup=$(mktemp /opt/hamtry/operations/hamtry-nginx.ml.XXXXXX)
cp -p "$nginx_config" "$backup"
if ! python3 - "$nginx_config" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
location = '''    location ^~ /api/liveness/ {
        client_max_body_size 2m;
        client_body_buffer_size 2m;
        proxy_read_timeout 150s;
        proxy_send_timeout 150s;
        proxy_pass http://127.0.0.1:8001;
        add_header Cache-Control "no-store" always;
    }
'''
pattern = r'    location \^~ /api/liveness/ \{[^{}]*\}\n'
if re.search(pattern, text):
    text, count = re.subn(pattern, lambda _: location, text)
    if count != 1:
        raise SystemExit('Expected exactly one ML location.')
else:
    anchor = '    location /api/ {'
    if text.count(anchor) != 1:
        raise SystemExit('Could not locate the single Hamtry API routing block.')
    text = text.replace(anchor, location + anchor, 1)
path.write_text(text)
PY
then
  cp -p "$backup" "$nginx_config"
  echo "Could not prepare the ML route; restored $backup." >&2
  exit 1
fi
if ! nginx -t || ! systemctl reload nginx; then
  cp -p "$backup" "$nginx_config"
  nginx -t && systemctl reload nginx
  echo "NGINX update failed; restored $backup." >&2
  exit 1
fi
echo "Hamtry ML is ready on loopback port 8001. NGINX backup: $backup"
