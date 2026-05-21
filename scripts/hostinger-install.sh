#!/usr/bin/env bash
# =============================================================================
# FintechPressHub — Hostinger Node.js Business Plan install script
# =============================================================================
# Run this script ONCE after your first GitHub-based deployment lands on
# Hostinger. It will:
#   1. Install pnpm (if not already installed)
#   2. Install all Node.js dependencies
#   3. Apply database schema to your external PostgreSQL database (Neon etc.)
#   4. Seed demo content (blog posts, authors, services, pricing, testimonials)
#   5. Build the production bundle (API server + React frontend)
#   6. Start the application with PM2
#
# Prerequisites:
#   - Node.js 20+ installed (set in hPanel → Node.js → Node version)
#   - External PostgreSQL database created (see Neon.tech — free tier)
#   - .env file filled in with your real DATABASE_URL, SITE_URL, etc.
#     (copy .env.example to .env, then edit it)
#   - SSH access to your Hostinger server
#
# NOTE: Hostinger Business Plan does NOT include built-in PostgreSQL.
#       Use an external provider — Neon (neon.tech) has a generous free tier
#       that works perfectly for this project.
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
NC='\033[0m'

log()  { echo -e "${BOLD}[install]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail() { echo -e "${RED}[fail]${NC}  $*"; exit 1; }

# ── 1. Check Node.js version ──────────────────────────────────────────────────
log "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || fail "Node.js not found. Enable Node.js 20+ in hPanel → Advanced → Node.js.")
MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR" -lt 20 ]; then
  fail "Node.js $NODE_VERSION is too old. This project requires Node.js 20+. Update in hPanel → Advanced → Node.js."
fi
ok "Node.js $NODE_VERSION"

# ── 2. Check .env exists and DATABASE_URL is set ──────────────────────────────
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    warn ".env not found. Copying .env.example → .env"
    warn "IMPORTANT: Edit .env now — set DATABASE_URL, SITE_URL, SESSION_SECRET, ADMIN_EMAILS, ADMIN_PASSWORD"
    cp .env.example .env
    fail "Please edit .env with your real values, then re-run this script."
  else
    fail ".env not found and .env.example is missing. Create .env with your environment variables."
  fi
fi
ok ".env exists"

# Load .env so DATABASE_URL is available for drizzle-kit
set -a; source .env; set +a

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is not set in .env.\n\n  Get a free PostgreSQL database from https://neon.tech\n  Then set DATABASE_URL=postgresql://user:password@host/dbname in your .env file."
fi
ok "DATABASE_URL is set"

if [ -z "${SITE_URL:-}" ]; then
  warn "SITE_URL is not set. Sitemaps, RSS, and canonical tags will use the fallback URL."
fi

if [ -z "${SESSION_SECRET:-}" ]; then
  warn "SESSION_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
fi

# ── 3. Install pnpm ───────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  log "Installing pnpm..."
  npm install -g pnpm@10
  ok "pnpm installed: $(pnpm --version)"
else
  ok "pnpm already installed: $(pnpm --version)"
fi

# ── 4. Install dependencies ───────────────────────────────────────────────────
log "Installing Node.js dependencies (this may take a few minutes)..."
pnpm install --frozen-lockfile
ok "Dependencies installed"

# ── 5. Apply database schema ──────────────────────────────────────────────────
log "Applying database schema to your PostgreSQL database..."
pnpm --filter @workspace/db run push
ok "Database schema applied"

# ── 6. Seed demo content ──────────────────────────────────────────────────────
log "Seeding demo content (blog posts, authors, services, testimonials)..."
pnpm --filter @workspace/scripts run seed:auto 2>/dev/null || \
  warn "Demo content already seeded or will auto-seed on first boot."
ok "Demo content ready (or will auto-seed on first boot)"

# ── 7. Build production bundle (includes DB schema migration) ─────────────────
log "Building production bundle (DB migration + React frontend + Express API)..."
pnpm run build:hostinger
ok "Production build complete (schema migrated + frontend + API built)"

# ── 8. Create logs directory ──────────────────────────────────────────────────
mkdir -p logs
ok "logs/ directory created"

# ── 9. Install PM2 and start the application ─────────────────────────────────
log "Setting up PM2 process manager..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  ok "PM2 installed"
fi

# Stop any existing instance, then start fresh
pm2 delete fintechpresshub 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save

# Set up auto-restart on server reboot
log "Enabling auto-start on server reboot..."
pm2 startup 2>/dev/null | tail -1 | grep -E "^sudo" | bash 2>/dev/null || \
  warn "Auto-start setup requires running the command printed above manually."

ok "Application started with PM2"
pm2 status

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD} FintechPressHub is now running!${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo ""
echo "  Verify it's working:"
echo "    curl https://www.yourdomain.com/api/healthz"
echo ""
echo "  Admin login:"
echo "    https://www.yourdomain.com/admin/login"
echo "    (use your ADMIN_EMAILS email + ADMIN_PASSWORD)"
echo ""
echo "  Useful PM2 commands:"
echo "    pm2 logs fintechpresshub       # live log stream"
echo "    pm2 restart fintechpresshub    # restart after config changes"
echo "    pm2 reload fintechpresshub     # zero-downtime reload"
echo "    pm2 monit                      # real-time CPU/memory dashboard"
echo ""
