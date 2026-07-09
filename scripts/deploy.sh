#!/usr/bin/env bash
# deploy.sh — build the static site and restart the Docker stack on the VPS.
#
# Usage: ./scripts/deploy.sh [VPS_HOST]
#
# If VPS_HOST is not provided it is read from the FREETOOLKIT_HOST env var.
# The script assumes passwordless SSH access configured in ~/.ssh/config and
# that Docker and docker-compose are installed on the VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-${FREETOOLKIT_HOST:-}}"

if [[ -z "$HOST" ]]; then
  echo "Usage: $0 <VPS_HOST>  or  FREETOOLKIT_HOST=your.vps ./scripts/deploy.sh" >&2
  exit 1
fi

echo "==> Syncing code to $HOST:/srv/freetoolkit …"
rsync -az --delete \
  --exclude ".venv" \
  --exclude "__pycache__" \
  --exclude "dist" \
  --exclude ".git" \
  --exclude "*.pyc" \
  "$ROOT/" \
  "$HOST:/srv/freetoolkit/"

echo "==> Rebuilding and restarting containers …"
ssh "$HOST" "
  cd /srv/freetoolkit
  docker compose -f infra/docker-compose.yml build --no-cache
  docker compose -f infra/docker-compose.yml up -d --remove-orphans
"

echo "==> Verifying health …"
sleep 5
ssh "$HOST" "docker compose -f /srv/freetoolkit/infra/docker-compose.yml ps"

echo "==> Deploy complete."
