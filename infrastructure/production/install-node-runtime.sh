#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
version=v24.21.0
case "$(uname -m)" in
  x86_64) architecture=x64; checksum=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6 ;;
  aarch64) architecture=arm64; checksum=6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2 ;;
  *) echo "Unsupported VPS architecture." >&2; exit 1 ;;
esac
runtime="/opt/hamtry/runtime/node-$version"
if [[ ! -d "$runtime" ]]; then
  temporary=$(mktemp -d)
  trap 'rm -rf -- "$temporary"' EXIT
  archive="node-$version-linux-$architecture.tar.xz"
  curl --fail --silent --show-error --location "https://nodejs.org/dist/$version/$archive" -o "$temporary/$archive"
  (cd "$temporary"; printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --strict)
  install -d -m 0755 "$runtime"
  tar -xJf "$temporary/$archive" --strip-components=1 -C "$runtime" --no-same-owner
fi
ln -sfn "node-$version" /opt/hamtry/runtime/node
/opt/hamtry/runtime/node/bin/node --version
