#!/usr/bin/env bash
# =============================================================================
# FintechPressHub — emergency rollback script
# =============================================================================
# Reverts the app to the previous git commit and restarts it.
# Run via SSH if a deploy breaks the live site.
#
# Usage:
#   chmod +x scripts/rollback.sh
#   ./scripts/rollback.sh
#
# What it does:
#   1. Shows the current + previous commit so you can confirm before rolling back
#   2. Stashes any uncommitted changes
#   3. Checks out HEAD~1 (previous commit)
#   4. Re-installs dependencies (in case lockfile changed)
#   5. Rebuilds the production bundle (frontend + API)
#   6. Reloads PM2 with zero downtime
#
# To roll FURTHER back (e.g. 2 commits):
#   git checkout HEAD~2
#   pnpm install --frozen-lockfile
#   pnpm run build:hostinger
#   pm2 reload ecosystem.config.cjs --env production
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BOLD}[rollback]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}     $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}   $*"; }
fail() { echo -e "${RED}[fail]${NC}   $*"; exit 1; }

echo ""
echo -e "${BOLD}Current commit:${NC}"
git log -1 --oneline
echo ""
echo -e "${BOLD}Previous commit (rollback target):${NC}"
git log -2 --oneline | tail -1
echo ""

read -r -p "Roll back to the previous commit? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 0
fi

log "Stashing any uncommitted changes..."
git stash --quiet 2>/dev/null || true

log "Checking out HEAD~1..."
git checkout HEAD~1
ok "Reverted to: $(git log -1 --oneline)"

log "Re-installing dependencies..."
pnpm install --frozen-lockfile
ok "Dependencies installed"

log "Rebuilding production bundle (includes DB schema + frontend + API)..."
pnpm run build:hostinger
ok "Build complete"

log "Reloading PM2 with zero downtime..."
pm2 reload ecosystem.config.cjs --env production
pm2 save
ok "PM2 reloaded"

echo ""
echo -e "${GREEN}${BOLD}Rollback complete.${NC}"
echo ""
echo -e "  Running commit: ${BOLD}$(git log -1 --oneline)${NC}"
echo ""
echo "  Verify the site:"
echo "    curl https://www.yourdomain.com/api/healthz"
echo ""
echo "  To undo the rollback and go back to the broken commit:"
echo "    git checkout main"
echo "    pnpm run build:hostinger"
echo "    pm2 reload ecosystem.config.cjs --env production"
echo ""
