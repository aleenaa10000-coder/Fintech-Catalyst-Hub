#!/usr/bin/env bash
# =============================================================================
# FintechPressHub — Hostinger Node.js Business Plan install script
# =============================================================================
# Run this script ONCE after uploading the project files to your Hostinger
# server via SSH or the File Manager. It will:
#   1. Install pnpm (if not already installed)
#   2. Install all Node.js dependencies
#   3. Apply database schema to your PostgreSQL database
#   4. Build the production bundle (API server + React frontend)
#   5. Start the application with PM2
#
# Prerequisites:
#   - Node.js 20+ installed (set in hPanel → Node.js → Node version)
#   - PostgreSQL database created in hPanel → Databases → PostgreSQL
#   - All environment variables set (copy .env.example → .env and fill in values)
#   - SSH access to your Hostinger server
#
# Usage:
#   chmod +x scripts/hostinger-install.sh
#   ./scripts/hostinger-install.sh
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()  { echo -e "${BOLD}[install]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail() { echo -e "${RED}[fail]${NC}  $*"; exit 1; }

# ── 1. Check Node.js version ──────────────────────────────────────────────────
log "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || fail "Node.js not found. Enable Node.js 20+ in hPanel → Node.js.")
MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR" -lt 20 ]; then
  fail "Node.js $NODE_VERSION is too old. This project requires Node.js 20+. Update in hPanel → Node.js → Node version."
fi
ok "Node.js $NODE_VERSION"

# ── 2. Check .env exists ──────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found. Copying .env.example → .env"
    warn "You MUST edit .env with your real DATABASE_URL, SITE_URL, SESSION_SECRET, etc."
    cp .env.example .env
  else
    fail ".env file not found. Create it with your environment variables before running this script."
  fi
fi
ok ".env exists"

# ── 3. Install pnpm ───────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  log "Installing pnpm..."
  npm install -g pnpm@latest
  ok "pnpm installed: $(pnpm --version)"
else
  ok "pnpm already installed: $(pnpm --version)"
fi

# ── 4. Install dependencies ───────────────────────────────────────────────────
log "Installing Node.js dependencies (this may take a few minutes)..."
GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile
ok "Dependencies installed"

# ── 5. Apply database schema ──────────────────────────────────────────────────
log "Applying database schema (drizzle push)..."
# Load .env so DATABASE_URL is available for drizzle-kit
set -a; source .env; set +a
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push
ok "Database schema applied"

# ── 6. Build production bundle ────────────────────────────────────────────────
log "Building production bundle (Vite + esbuild)..."
GIT_DIR=/tmp/fakegit pnpm run build:production
ok "Production build complete"

# ── 7. Create logs directory ──────────────────────────────────────────────────
mkdir -p logs
ok "logs/ directory created"

# ── 8. Start / restart with PM2 ──────────────────────────────────────────────
log "Starting application with PM2..."
if command -v pm2 &>/dev/null; then
  # Stop any existing instance first
  pm2 delete fintechpresshub 2>/dev/null || true
  pm2 start ecosystem.config.cjs --env production
  pm2 save
  ok "Application started with PM2"
  pm2 status
else
  warn "PM2 not found. Starting without PM2 (not recommended for production):"
  warn "  Install PM2: npm install -g pm2"
  warn "  Then run: pm2 start ecosystem.config.cjs --env production && pm2 save"
  warn ""
  warn "Starting directly for testing only:"
  NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs &
  echo $! > /tmp/fintechpresshub.pid
  ok "Application started (PID: $(cat /tmp/fintechpresshub.pid)). Not persistent — use PM2 for production."
fi

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD} FintechPressHub is now running!${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo ""
echo "  Next steps:"
echo "  1. Point your domain DNS to Hostinger nameservers (if not done)"
echo "  2. Enable SSL in hPanel → Websites → SSL"
echo "  3. Verify your SITE_URL in .env matches your domain"
echo "  4. Test admin login at: https://yourdomain.com/admin/login"
echo ""
echo "  Useful commands:"
echo "  pm2 logs fintechpresshub    # view live logs"
echo "  pm2 restart fintechpresshub # restart after config changes"
echo "  pm2 reload fintechpresshub  # zero-downtime reload"
echo ""
