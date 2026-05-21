#!/usr/bin/env bash
# =============================================================================
# FintechPressHub — persistent uploads directory setup
# =============================================================================
# Creates a persistent uploads directory OUTSIDE the app folder so uploaded
# images and files survive every redeploy.
#
# Run this ONCE via SSH after first deploy. Then set the LOCAL_UPLOADS_DIR
# environment variable in hPanel → Node.js → Environment Variables.
#
# Usage:
#   chmod +x scripts/setup-uploads.sh
#   ./scripts/setup-uploads.sh
#
# What it does:
#   1. Creates /home/USERNAME/uploads  (outside the app root — survives redeploys)
#   2. Creates a symlink: APP_DIR/data/uploads → /home/USERNAME/uploads
#   3. Prints the LOCAL_UPLOADS_DIR value to add in hPanel
# =============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${BOLD}[setup-uploads]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USERNAME="$(whoami)"
UPLOADS_DIR="/home/${USERNAME}/uploads"
SYMLINK_DIR="${APP_DIR}/data/uploads"

log "App directory:       $APP_DIR"
log "Persistent uploads:  $UPLOADS_DIR"
log "Symlink:             $SYMLINK_DIR → $UPLOADS_DIR"
echo ""

# ── Create the persistent directory outside the app root ─────────────────────
if [ -d "$UPLOADS_DIR" ]; then
  ok "Persistent uploads directory already exists: $UPLOADS_DIR"
else
  mkdir -p "$UPLOADS_DIR"
  chmod 755 "$UPLOADS_DIR"
  ok "Created: $UPLOADS_DIR"
fi

# ── Create the data/ directory inside the app if it doesn't exist ────────────
mkdir -p "${APP_DIR}/data"

# ── Create the symlink ────────────────────────────────────────────────────────
if [ -L "$SYMLINK_DIR" ]; then
  ok "Symlink already exists: $SYMLINK_DIR"
elif [ -d "$SYMLINK_DIR" ]; then
  warn "$SYMLINK_DIR is a real directory (not a symlink). Moving existing files..."
  mv "$SYMLINK_DIR" "${SYMLINK_DIR}.bak"
  ln -s "$UPLOADS_DIR" "$SYMLINK_DIR"
  ok "Symlink created (old data backed up to ${SYMLINK_DIR}.bak)"
else
  ln -s "$UPLOADS_DIR" "$SYMLINK_DIR"
  ok "Symlink created: $SYMLINK_DIR → $UPLOADS_DIR"
fi

echo ""
echo -e "${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD} Persistent uploads setup complete${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}"
echo ""
echo "  Next step — add this in hPanel → Node.js → Environment Variables:"
echo ""
echo -e "    ${BOLD}LOCAL_UPLOADS_DIR=${UPLOADS_DIR}${NC}"
echo ""
echo "  Then restart: pm2 restart fintechpresshub"
echo ""
echo "  Uploaded files will now survive all future redeploys."
echo ""
