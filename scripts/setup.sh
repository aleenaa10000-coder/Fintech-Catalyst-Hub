#!/usr/bin/env bash
# One-command setup for FintechPressHub.
#
# Installs all dependencies, pushes the database schema, seeds demo data,
# and builds the API server — everything a fresh import needs to become
# fully operational.
#
# Usage:
#   bash scripts/setup.sh
#
# Prerequisites:
#   • pnpm installed (Node ≥ 18)
#   • DATABASE_URL environment variable set (Replit Postgres or any Postgres)

set -euo pipefail

GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step()  { printf "\n%s==> %s%s\n" "$BOLD" "$1" "$RESET"; }
ok()    { printf "  %s✓%s  %s\n" "$GREEN" "$RESET" "$1"; }
warn()  { printf "  %s!%s  %s\n" "$YELLOW" "$RESET" "$1"; }
fail()  { printf "\n%sERROR:%s %s\n" "$RED" "$RESET" "$1"; exit 1; }

# ---------------------------------------------------------------------------
step "Checking prerequisites"

command -v node >/dev/null 2>&1 || fail "Node.js is not on PATH"
ok "node $(node -v)"

command -v pnpm >/dev/null 2>&1 || fail "pnpm is not on PATH — run: npm install -g pnpm"
ok "pnpm $(pnpm -v)"

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is not set. Provision a Postgres database and set this variable first."
fi
ok "DATABASE_URL is set"

# ---------------------------------------------------------------------------
step "Installing dependencies"

GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile
ok "All workspace packages installed"

# ---------------------------------------------------------------------------
step "Pushing database schema"

pnpm --filter @workspace/db run push
ok "Schema pushed to database"

# ---------------------------------------------------------------------------
step "Seeding demo data"

pnpm --filter @workspace/scripts run seed
ok "Demo data seeded"

# ---------------------------------------------------------------------------
step "Building API server"

pnpm --filter @workspace/api-server run build
ok "API server built (dist/index.mjs)"

# ---------------------------------------------------------------------------
printf "\n%s%s Setup complete!%s\n" "$GREEN" "$BOLD" "$RESET"
printf "  Start the application with your workflow runner, or:\n"
printf "    API:      cd artifacts/api-server && node ./dist/index.mjs\n"
printf "    Frontend: cd artifacts/fintechpresshub && pnpm dev\n\n"
