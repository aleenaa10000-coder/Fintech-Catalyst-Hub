#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  trap - INT TERM
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

PORT=8080 NODE_ENV=development pnpm --filter @workspace/api-server run dev &
API_PID=$!

PORT=5000 BASE_PATH=/ API_PROXY_TARGET=http://127.0.0.1:8080 \
  pnpm --filter @workspace/fintechpresshub run dev
