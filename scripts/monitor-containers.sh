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

PROJECT_NAME="${ALERTS_COMPOSE_PROJECT:-$(basename "$ROOT_DIR")}" 
LOG_LINES="${ALERTS_LOG_LINES:-200}"

send_message() {
  local message="$1"
  curl -sS -X POST "https://api.telegram.org/bot${ALERTS_TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${ALERTS_TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" >/dev/null
}

echo "Monitoring Docker events for project: $PROJECT_NAME"

docker events \
  --filter "event=die" \
  --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
  --format '{{.Time}} {{.Actor.Attributes.com.docker.compose.service}} {{.Actor.Attributes.name}} {{.Actor.Attributes.exitCode}}' \
| while read -r timestamp service name exit_code; do
  service_name="$service"
  if [[ -z "$service_name" ]]; then
    service_name="$name"
  fi

  logs="$(cd "$ROOT_DIR" && docker compose logs --tail "$LOG_LINES" "$service_name" 2>&1 || true)"
  logs="$(echo "$logs" | tail -c 3500)"

  message="Container ${service_name} stopped (exit ${exit_code}).\nTime: ${timestamp}\n\nLogs (last ${LOG_LINES} lines):\n${logs}"
  send_message "$message"
  echo "Alert sent for ${service_name}."
done
