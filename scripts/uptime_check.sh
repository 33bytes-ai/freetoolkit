#!/usr/bin/env bash
# uptime_check.sh — external healthcheck: curl the live site and alert on
# failure via a webhook (Slack/Discord/generic incoming webhook).
#
# Must run from OUTSIDE the VPS (GitHub Actions, your own machine, a free
# cron host) — a check running on the same box as nginx can't alert you if
# that box is the one that's down. See .github/workflows/uptime.yml for the
# zero-signup scheduled runner already wired to this script.
#
# Usage:
#   UPTIME_URL=https://yourdomain.tld ./scripts/uptime_check.sh
#
# Env vars:
#   UPTIME_URL          Required. URL to check (e.g. site base_url).
#   UPTIME_WEBHOOK_URL   Optional. POSTed a JSON {"text": "..."} payload on
#                        failure — works with Slack and Discord incoming
#                        webhooks out of the box.
#   UPTIME_TIMEOUT       Optional. Request timeout in seconds (default: 10).
#   UPTIME_STATE_FILE    Optional. Path used to remember the last check
#                        result, so alerts only fire on state *changes*
#                        (down, then recovered) instead of every run.
#                        Default: /tmp/freetoolkit_uptime_state.
#
# Cron example (run every 5 minutes from a machine that isn't the VPS):
#   */5 * * * * UPTIME_URL=https://yourdomain.tld UPTIME_WEBHOOK_URL=https://hooks.slack.com/... \
#     /path/to/freetoolkit/scripts/uptime_check.sh >> /var/log/freetoolkit_uptime.log 2>&1
set -euo pipefail

URL="${UPTIME_URL:?UPTIME_URL is required, e.g. UPTIME_URL=https://yourdomain.tld $0}"
WEBHOOK_URL="${UPTIME_WEBHOOK_URL:-}"
TIMEOUT="${UPTIME_TIMEOUT:-10}"
STATE_FILE="${UPTIME_STATE_FILE:-/tmp/freetoolkit_uptime_state}"

now() { date -u '+%Y-%m-%d %H:%M:%S UTC'; }

notify() {
  local message="$1"
  echo "[$(now)] $message"
  if [[ -n "$WEBHOOK_URL" ]]; then
    local escaped="${message//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    curl -fsS -m "$TIMEOUT" -X POST -H "Content-Type: application/json" \
      -d "{\"text\": \"${escaped}\"}" \
      "$WEBHOOK_URL" >/dev/null || echo "[$(now)] warning: webhook POST failed"
  fi
}

previous_state="unknown"
[[ -f "$STATE_FILE" ]] && previous_state="$(cat "$STATE_FILE")"

http_code="$(curl -s -o /dev/null -w '%{http_code}' -m "$TIMEOUT" "$URL" || true)"
[[ -z "$http_code" ]] && http_code="000"

if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
  current_state="up"
  echo "[$(now)] $URL is up (HTTP $http_code)"
  if [[ "$previous_state" == "down" ]]; then
    notify "✅ $URL is back up (HTTP $http_code)"
  fi
else
  current_state="down"
  if [[ "$previous_state" != "down" ]]; then
    notify "🔴 $URL is down (HTTP $http_code)"
  else
    echo "[$(now)] $URL still down (HTTP $http_code)"
  fi
fi

echo "$current_state" > "$STATE_FILE"

[[ "$current_state" == "up" ]]
