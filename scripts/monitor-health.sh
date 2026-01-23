#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ALERTS_ENV_FILE:-$ROOT_DIR/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

if [[ "${ALERTS_ENABLED:-false}" != "true" ]]; then
  echo "ALERTS_ENABLED is not true; exiting."
  exit 0
fi

if [[ -z "${ALERTS_TELEGRAM_BOT_TOKEN:-}" || -z "${ALERTS_TELEGRAM_CHAT_ID:-}" ]]; then
  echo "ALERTS_TELEGRAM_BOT_TOKEN and ALERTS_TELEGRAM_CHAT_ID are required."
  exit 1
fi

HEALTHCHECK_URL="${ALERTS_HEALTHCHECK_URL:-http://localhost:3000/api/v1/health}"
INTERVAL="${ALERTS_HEALTHCHECK_INTERVAL:-30}"
TIMEOUT="${ALERTS_HEALTHCHECK_TIMEOUT:-5}"
STATE_FILE="${ALERTS_HEALTHCHECK_STATE_FILE:-/tmp/chat-analytics-health.status}"

send_message() {
  local message="$1"
  curl -sS -X POST "https://api.telegram.org/bot${ALERTS_TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${ALERTS_TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" >/dev/null
}

get_status() {
  local response
  response=$(curl -sS -m "$TIMEOUT" -w "\n%{http_code}" "$HEALTHCHECK_URL" || true)
  local body
  body=$(echo "$response" | sed '$d')
  local code
  code=$(echo "$response" | tail -n 1)

  if [[ "$code" != "200" ]]; then
    echo "down"
    return
  fi
  if echo "$body" | grep -q '"ok"\s*:\s*true'; then
    echo "up"
  else
    echo "down"
  fi
}

last_status=""
if [[ -f "$STATE_FILE" ]]; then
  last_status=$(cat "$STATE_FILE" || true)
fi

echo "Monitoring healthcheck: $HEALTHCHECK_URL (interval ${INTERVAL}s)"

while true; do
  status=$(get_status)
  if [[ "$status" != "$last_status" ]]; then
    if [[ "$status" == "down" ]]; then
      send_message "Healthcheck DOWN: ${HEALTHCHECK_URL}"
    else
      send_message "Healthcheck UP: ${HEALTHCHECK_URL}"
    fi
    echo "$status" > "$STATE_FILE"
    last_status="$status"
  fi
  sleep "$INTERVAL"
done
