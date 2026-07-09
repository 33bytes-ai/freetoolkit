#!/usr/bin/env bash
# analytics_report.sh — regenerate the GoAccess HTML report from log archives.
# Run this as a cron job or manually to refresh /reports/index.html.
#
# Cron example (weekly, run on the VPS):
#   0 3 * * 0 /srv/freetoolkit/scripts/analytics_report.sh >> /var/log/freetoolkit_analytics.log 2>&1
set -euo pipefail

NGINX_LOGS="${NGINX_LOGS_DIR:-/var/log/nginx}"
REPORTS_DIR="${ANALYTICS_REPORTS_DIR:-/srv/freetoolkit/reports}"
CONFIG="/srv/freetoolkit/infra/goaccess.conf"

mkdir -p "$REPORTS_DIR/db"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Regenerating analytics report …"

# Combine current log and any rotated/compressed archives
LOGFILES=("$NGINX_LOGS/access.log")
for archive in "$NGINX_LOGS/access.log."*.gz; do
  [[ -f "$archive" ]] && LOGFILES+=("$archive")
done

goaccess "${LOGFILES[@]}" \
  --config-file "$CONFIG" \
  --output "$REPORTS_DIR/index.html" \
  --log-format COMBINED \
  --db-path "$REPORTS_DIR/db"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Done. Report at $REPORTS_DIR/index.html"
