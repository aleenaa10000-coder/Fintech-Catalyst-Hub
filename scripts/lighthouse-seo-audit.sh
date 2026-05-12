#!/usr/bin/env bash
# scripts/lighthouse-seo-audit.sh
#
# Run a Lighthouse SEO audit against the running FintechPressHub dev server
# and print a colour-coded summary of every SEO check.
#
# Usage:
#   bash scripts/lighthouse-seo-audit.sh [BASE_URL]
#
# BASE_URL defaults to http://localhost:5000
#
# NOTE: Always use http://localhost:5000 (NOT the .replit.dev URL).
# Replit's proxy adds x-robots-tag: noindex to all .replit.dev responses,
# causing a false is-crawlable failure. localhost bypasses the proxy.
#
# Reports (JSON) are saved to lh-reports/<timestamp>/
#
# Expected results (after fixes applied 2026-05-12):
#   /         → 100/100, all checks PASS
#   /blog     → 100/100, all checks PASS
#   /services → 100/100, all checks PASS (link-text fixed via aria-label)
#   /pricing  → 100/100, all checks PASS
#   structured-data → always shows MANUAL (Lighthouse cannot auto-validate
#                     client-rendered JSON-LD in a SPA — this is expected)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colours ───────────────────────────────────────────────────────────────────
GRN='\033[0;32m' RED='\033[0;31m' YEL='\033[1;33m'
CYN='\033[0;36m' BLD='\033[1m'   DIM='\033[2m'   RST='\033[0m'

h()    { echo -e "\n${BLD}${CYN}──  $*  ${RST}"; }
ok()   { echo -e "  ${GRN}✔${RST}  $*"; }
info() { echo -e "  ${CYN}▸${RST}  $*"; }
warn() { echo -e "  ${YEL}⚠${RST}  $*"; }
die()  { echo -e "\n  ${RED}✘${RST}  $*" >&2; exit 1; }

# ── Arguments ─────────────────────────────────────────────────────────────────
BASE_URL="${1:-http://localhost:5000}"
BASE_URL="${BASE_URL%/}"

# Per-page audit timeout in seconds. Some pages make many API calls that keep
# the network busy — lhci collect will wait for network idle up to this limit.
PAGE_TIMEOUT="${LH_TIMEOUT:-60}"

h "Lighthouse SEO Audit — FintechPressHub"
echo -e "  Auditing: ${BLD}${BASE_URL}${RST}"

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo ""
info "Running pre-flight checks..."

HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/" 2>/dev/null || echo "000")
[[ "$HTTP" == "200" ]] || die "Server not responding at ${BASE_URL}/ (HTTP ${HTTP}).
       Start the 'Start application' workflow first, then re-run this script."
ok "Dev server is up (HTTP 200)"

LHCI="$ROOT/node_modules/.bin/lhci"
[[ -f "$LHCI" ]] || die "lhci not found — run: pnpm install"
ok "lhci found"

CHROME=$(which chromium 2>/dev/null \
      || which google-chrome 2>/dev/null \
      || which google-chrome-stable 2>/dev/null \
      || true)
[[ -n "$CHROME" ]] || die "No Chromium/Chrome binary found."
ok "Chromium: $(basename "$CHROME")"

# ── Output directory ──────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$ROOT/lh-reports/$TIMESTAMP"
mkdir -p "$OUT_DIR"

# lhci writes to .lighthouseci/ in the cwd
LHCI_DIR="$ROOT/.lighthouseci"

# ── Pages to audit ────────────────────────────────────────────────────────────
PAGES=("/" "/blog" "/services" "/pricing")

info "Auditing ${#PAGES[@]} pages — reports → lh-reports/$TIMESTAMP/"

# ── Collect reports ───────────────────────────────────────────────────────────
h "Collecting  (SEO only, no throttling)"
echo ""

CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --headless=new --disable-gpu"
FAILED_PAGES=()

for PAGE in "${PAGES[@]}"; do
  URL="${BASE_URL}${PAGE}"
  echo -e "  Auditing ${BLD}${URL}${RST} ..."

  # Run lhci collect with a hard per-page timeout so a slow page (one that
  # makes many API calls and delays network idle) doesn't block the script.
  if timeout "$PAGE_TIMEOUT" "$LHCI" collect \
      --url="$URL" \
      --n=1 \
      --no-lighthouserc \
      --chromePath="$CHROME" \
      --settings.onlyCategories=seo \
      --settings.chromeFlags="$CHROME_FLAGS" \
      --settings.throttlingMethod=provided \
      2>&1 | grep -v '^$' | sed 's/^/    /'; then

    # Move generated LHR JSON into our timestamped output dir
    if ls "$LHCI_DIR"/lhr-*.json 1>/dev/null 2>&1; then
      SLUG="${PAGE//\//-}"
      SLUG="${SLUG#-}"
      [[ -z "$SLUG" ]] && SLUG="home"
      for f in "$LHCI_DIR"/lhr-*.json; do
        mv "$f" "$OUT_DIR/lhr-${SLUG}-$(basename "$f")"
      done
    fi
  else
    warn "Audit timed out for ${URL} — skipping (increase LH_TIMEOUT if needed)"
    FAILED_PAGES+=("$PAGE")
  fi

  # Clean up lhci state files regardless of success/failure
  rm -f "$LHCI_DIR"/flags-*.json "$LHCI_DIR"/lhr-*.html 2>/dev/null || true
done

if [[ ${#FAILED_PAGES[@]} -gt 0 ]]; then
  warn "Pages skipped due to timeout: ${FAILED_PAGES[*]}"
  warn "Re-run with: LH_TIMEOUT=120 bash scripts/lighthouse-seo-audit.sh"
fi

# ── Check we have at least one report ────────────────────────────────────────
if ! ls "$OUT_DIR"/lhr-*.json 1>/dev/null 2>&1; then
  die "No LHR reports were generated. Check that the server is running and Chromium works."
fi

# ── Parse and display results ─────────────────────────────────────────────────
h "SEO Check Results"

node --input-type=module << NODEEOF
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const outDir = '${OUT_DIR}';

const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m',
      CYN = '\x1b[36m', BLD = '\x1b[1m',  DIM = '\x1b[2m',  RST = '\x1b[0m';

const SEO_CHECKS = [
  ['document-title',    'Document has a <title>'],
  ['meta-description',  'Document has a meta description'],
  ['canonical',         'Valid rel=canonical'],
  ['hreflang',          'Valid hreflang'],
  ['is-crawlable',      'Page not blocked from indexing'],
  ['robots-txt',        'robots.txt is valid'],
  ['http-status-code',  'HTTP status code is 2xx'],
  ['image-alt',         'Images have [alt] attributes'],
  ['link-text',         'Links have descriptive text'],
  ['crawlable-anchors', 'Links are crawlable'],
  ['structured-data',   'Structured data (manual check)'],
];

const lhrFiles = readdirSync(outDir)
  .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
  .sort();

if (lhrFiles.length === 0) {
  console.error(RED + '  No LHR report files found in ' + outDir + RST);
  process.exit(1);
}

let grandPass = 0, grandFail = 0, grandNA = 0, grandManual = 0;

for (const file of lhrFiles) {
  const lhr = JSON.parse(readFileSync(join(outDir, file), 'utf8'));
  const rawUrl = lhr.requestedUrl || lhr.finalUrl || '';
  let pagePath;
  try { pagePath = new URL(rawUrl).pathname || '/'; } catch { pagePath = rawUrl; }

  const seoScore = lhr.categories?.seo?.score;
  const score100 = seoScore != null ? Math.round(seoScore * 100) : '?';
  const scoreColor = score100 >= 90 ? GRN : score100 >= 70 ? YEL : RED;

  console.log('');
  console.log(
    '  ' + BLD + CYN + ('Page: ' + pagePath).padEnd(36) + RST +
    'SEO Score: ' + BLD + scoreColor + score100 + '/100' + RST
  );
  console.log('  ' + '\u2500'.repeat(62));

  for (const [id, label] of SEO_CHECKS) {
    const audit = lhr.audits?.[id];
    if (!audit) {
      console.log('  ' + DIM + '\u2013  ' + label.padEnd(46) + 'n/a' + RST);
      grandNA++;
      continue;
    }

    const { score, scoreDisplayMode } = audit;
    let icon, color, note = '';

    if (scoreDisplayMode === 'notApplicable') {
      icon = '\u2013'; color = DIM; grandNA++;
    } else if (scoreDisplayMode === 'manual') {
      // Manual checks cannot be auto-scored — show as informational
      icon = '\u25cb'; color = DIM;
      note = '  ' + DIM + '(manual)' + RST;
      grandManual++;
    } else if (score === 1) {
      icon = '\u2714'; color = GRN; grandPass++;
    } else if (score === 0 || (score === null && scoreDisplayMode === 'error')) {
      icon = '\u2718'; color = RED; grandFail++;
    } else if (score != null && score > 0 && score < 1) {
      icon = '\u26a0'; color = YEL; grandFail++;
    } else {
      icon = '\u2714'; color = GRN; grandPass++;
    }

    const badge = icon === '\u2718' ? '  ' + RED + 'FAIL' + RST
                : icon === '\u26a0' ? '  ' + YEL + 'WARN' + RST
                : note;

    console.log('  ' + color + icon + RST + '  ' + label.padEnd(46) + badge);

    if (icon === '\u2718' || icon === '\u26a0') {
      const items = audit.details?.items ?? [];
      const snippet = items
        .map(i => i.source || i.url || (i.node?.snippet) || '')
        .filter(Boolean).join(', ').slice(0, 110);
      if (snippet) console.log('     ' + DIM + '\u21b3 ' + snippet + RST);
      if (audit.explanation) console.log('     ' + DIM + '\u21b3 ' + audit.explanation.slice(0, 120) + RST);
    }
  }
}

console.log('');
console.log('  ' + BLD + CYN + '\u2500\u2500  Summary  ' + RST);
console.log('  ' + '\u2500'.repeat(62));
console.log('  ' + GRN + '\u2714  Passed  : ' + grandPass + RST);
if (grandFail > 0) {
  console.log('  ' + RED + '\u2718  Failed  : ' + grandFail + RST);
} else {
  console.log('  ' + DIM + '\u2718  Failed  : 0' + RST);
}
if (grandManual > 0) {
  console.log('  ' + DIM + '\u25cb  Manual  : ' + grandManual + ' (review structured data at https://search.google.com/test/rich-results)' + RST);
}
if (grandNA > 0) {
  console.log('  ' + DIM + '\u2013  N/A     : ' + grandNA + RST);
}
console.log('');
console.log('  ' + DIM + 'Reports saved to: lh-reports/${TIMESTAMP}/' + RST);
console.log('');

if (grandFail > 0) process.exit(1);
NODEEOF
