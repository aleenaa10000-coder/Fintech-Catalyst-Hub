#!/usr/bin/env bash
# Post-import health check for FintechPressHub.
# Verifies that the workspace is correctly wired up after a fresh clone /
# Replit import. Prints one READY / FAILED line per check and exits non-zero
# if anything is wrong.
#
# Usage:
#   bash scripts/bootstrap.sh                # run all checks
#   API_PORT=8080 WEB_PORT=21096 bash scripts/bootstrap.sh
#
# The API and web checks are skipped (marked SKIP) when their ports are not
# listening yet — that's expected before the workflows are started.

set -u

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-21096}"

GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
YELLOW=$'\033[0;33m'
DIM=$'\033[2m'
RESET=$'\033[0m'

fail_count=0

ok()   { printf "  %sREADY%s  %s\n"  "$GREEN"  "$RESET" "$1"; }
bad()  { printf "  %sFAILED%s %s%s%s\n" "$RED" "$RESET" "$1" "${2:+ — $2}" ""; fail_count=$((fail_count + 1)); }
skip() { printf "  %sSKIP%s   %s%s\n"   "$YELLOW" "$RESET" "$1" "${2:+ ($2)}"; }
hdr()  { printf "\n%s== %s ==%s\n" "$DIM" "$1" "$RESET"; }

# ---------------------------------------------------------------------------
hdr "Toolchain"

if command -v node >/dev/null 2>&1; then
  ok "node $(node -v)"
else
  bad "node" "not on PATH"
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm $(pnpm -v)"
else
  bad "pnpm" "not on PATH — run: npm install -g pnpm"
fi

# ---------------------------------------------------------------------------
hdr "Workspace dependencies"

for pkg in \
  "node_modules" \
  "artifacts/api-server/node_modules" \
  "artifacts/fintechpresshub/node_modules" \
  "lib/db/node_modules" \
  "scripts/node_modules"
do
  if [ -d "$pkg" ]; then
    ok "$pkg"
  else
    bad "$pkg" "missing — run: pnpm install"
  fi
done

# ---------------------------------------------------------------------------
hdr "Environment"

if [ -n "${DATABASE_URL:-}" ]; then
  ok "DATABASE_URL set"
else
  bad "DATABASE_URL" "unset — provision Replit Postgres or copy .env.example to .env"
fi

for var in ADMIN_EMAILS REPORT_FROM_EMAIL; do
  if [ -n "${!var:-}" ]; then
    ok "$var set"
  else
    skip "$var" "optional, recommended for production"
  fi
done

# ---------------------------------------------------------------------------
hdr "Database connectivity"

if [ -n "${DATABASE_URL:-}" ]; then
  # Use the `pg` driver bundled with the @workspace/db package so we don't
  # depend on `psql` being installed on PATH.
  if (cd lib/db && node --input-type=module -e "
    import pg from 'pg';
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try { await c.connect(); await c.query('select 1'); await c.end(); }
    catch (e) { console.error(e.message); process.exit(1); }
  ") 2>/tmp/bootstrap-db.err; then
    ok "Postgres reachable"
  else
    bad "Postgres" "$(head -n1 /tmp/bootstrap-db.err 2>/dev/null)"
  fi
else
  skip "Postgres check" "DATABASE_URL not set"
fi

# ---------------------------------------------------------------------------
hdr "Running services"

probe() {
  # probe <label> <url>
  local label="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -m 3 -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "304" ]; then
    ok "$label ($url → $code)"
  elif [ "$code" = "000" ]; then
    skip "$label" "not listening on $url — start the workflow"
  else
    bad "$label" "$url returned HTTP $code"
  fi
}

probe "API server"  "http://127.0.0.1:${API_PORT}/api/stats/trust"
probe "Web (Vite)"  "http://127.0.0.1:${WEB_PORT}/"

# ---------------------------------------------------------------------------
printf "\n"
if [ "$fail_count" -eq 0 ]; then
  printf "%sAll checks passed.%s\n" "$GREEN" "$RESET"
  exit 0
else
  printf "%s%d check(s) failed.%s See messages above.\n" "$RED" "$fail_count" "$RESET"
  exit 1
fi
