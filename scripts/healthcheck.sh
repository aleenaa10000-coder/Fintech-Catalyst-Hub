#!/usr/bin/env bash
# Persistent health monitor for FintechPressHub
#
# Polls the API server (port 8080) and the Vite dev server (port 5000)
# every INTERVAL seconds. When a service stops responding the script
# kills any zombie process still holding that port so Replit's built-in
# workflow auto-restart can bind it cleanly on its next attempt.
#
# Usage (as a Replit console workflow):
#   bash scripts/healthcheck.sh

set -euo pipefail

API_PORT=8080
FE_PORT=5000
INTERVAL=30
FAIL_THRESHOLD=2   # consecutive failures before freeing the port

declare -A fail_count
fail_count[$API_PORT]=0
fail_count[$FE_PORT]=0

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] [healthcheck] $*"
}

free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    log "WARN  Port $port is held by zombie PIDs ${pids//$'\n'/ } — sending SIGTERM"
    echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
    sleep 3
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      log "WARN  Port $port still blocked — escalating to SIGKILL"
      echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
    fi
    log "INFO  Port $port is now free; workflow auto-restart can bind it"
  else
    log "INFO  Port $port has no holding process — nothing to free"
  fi
}

check_service() {
  local name="$1"
  local port="$2"
  local path="${3:-/}"
  local url="http://localhost:$port$path"
  local http_code

  http_code=$(curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" == "000" || "$http_code" == "502" || "$http_code" == "503" ]]; then
    fail_count[$port]=$(( ${fail_count[$port]} + 1 ))
    log "FAIL  $name ($url) → HTTP ${http_code} [consecutive failures: ${fail_count[$port]}]"
    if (( ${fail_count[$port]} >= FAIL_THRESHOLD )); then
      free_port "$port"
      fail_count[$port]=0
    fi
    return 1
  fi

  if (( ${fail_count[$port]} > 0 )); then
    log "OK    $name ($url) → HTTP $http_code  (recovered after ${fail_count[$port]} prior failure(s))"
  else
    log "OK    $name ($url) → HTTP $http_code"
  fi
  fail_count[$port]=0
  return 0
}

log "Health monitor started — checking every ${INTERVAL}s (threshold: ${FAIL_THRESHOLD} consecutive failures)"
log "Monitoring: API Server on :${API_PORT}  |  Frontend on :${FE_PORT}"

while true; do
  check_service "API Server" "$API_PORT" "/api/healthz" || true
  check_service "Frontend"   "$FE_PORT"  "/"            || true
  sleep "$INTERVAL"
done
