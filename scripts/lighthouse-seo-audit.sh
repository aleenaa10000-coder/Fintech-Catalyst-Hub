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
# Use http://localhost:5000 (not the .replit.dev URL) to avoid Replit's proxy
# adding x-robots-tag: noindex which causes a false is-crawlable failure.
#
# Reports (JSON + HTML) are saved to lh-reports/<timestamp>/

set -euo pipefail
IFS=$'\n\t'

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
[[ -f "$LHCI" ]] || die "lhci not found at $LHCI  —  run: pnpm install"
ok "lhci found  ($(\"$LHCI\" --version 2>/dev/null | head -1))"

CHROME=$(which chromium 2>/dev/null \
      || which google-chrome 2>/dev/null \
      || which google-chrome-stable 2>/dev/null \
      || true)
[[ -n "$CHROME" ]] || die "No Chromium/Chrome binary found."
ok "Chromium: $CHROME"

# ── Pages to audit ────────────────────────────────────────────────────────────
PAGES=("/" "/blog" "/services" "/pricing" "/about")

# ── Output directory ──────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$ROOT/lh-reports/$TIMESTAMP"
mkdir -p "$OUT_DIR"
info "Reports will be saved to: lh-reports/$TIMESTAMP/"

# ── Build URLs list for config ────────────────────────────────────────────────
URLS_LINES=""
for PAGE in "${PAGES[@]}"; do
  URLS_LINES="${URLS_LINES}      \"${BASE_URL}${PAGE}\","$'\n'
done

# ── Temporary LHCI config ─────────────────────────────────────────────────────
TMP_CFG=$(mktemp /tmp/lhci-seo-XXXXXX.cjs)
# shellcheck disable=SC2064
trap "rm -f '$TMP_CFG'" EXIT

cat > "$TMP_CFG" << EOF
'use strict';
module.exports = {
  ci: {
    collect: {
      url: [
${URLS_LINES}      ],
      numberOfRuns: 1,
      chromePath: "${CHROME}",
      settings: {
        onlyCategories: ["seo"],
        chromeFlags: "--no-sandbox --disable-dev-shm-usage --headless=new --disable-gpu",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: "provided",
      },
    },
  },
};
EOF

# ── Run lhci collect ──────────────────────────────────────────────────────────
h "Collecting reports  (${#PAGES[@]} pages, SEO only) ..."
echo ""

"$LHCI" collect \
  --outputDir="$OUT_DIR" \
  --config="$TMP_CFG" \
  2>&1 | sed 's/^/  /' || die "lhci collect failed — see output above."

# ── Parse results via Node.js ─────────────────────────────────────────────────
h "SEO Check Results"

node --input-type=module << NODEEOF
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const outDir = '$OUT_DIR';

const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m',
      CYN = '\x1b[36m', BLD = '\x1b[1m',  DIM = '\x1b[2m',  RST = '\x1b[0m';

const SEO_CHECKS = [
  ['document-title',    'Document has a <title>'],
  ['meta-description',  'Document has a meta description'],
  ['canonical',         'Valid rel=canonical'],
  ['hreflang',          'Valid hreflang'],
  ['is-crawlable',      'Page is not blocked from indexing'],
  ['robots-txt',        'robots.txt is valid'],
  ['http-status-code',  'HTTP status code is 2xx'],
  ['image-alt',         'Images have [alt] attributes'],
  ['link-text',         'Links have descriptive text'],
  ['crawlable-anchors', 'Links are crawlable'],
  ['structured-data',   'Structured data is valid'],
];

let lhrFiles;
try {
  lhrFiles = readdirSync(outDir).filter(f => f.endsWith('.json') && f.startsWith('lhr-'));
} catch {
  console.error(RED + '  Cannot read output directory: ' + outDir + RST);
  process.exit(1);
}

if (lhrFiles.length === 0) {
  console.error(RED + '  No LHR report files found in ' + outDir + RST);
  process.exit(1);
}

let grandPass = 0, grandFail = 0, grandNA = 0;

for (const file of lhrFiles.sort()) {
  const lhr = JSON.parse(readFileSync(join(outDir, file), 'utf8'));
  const rawUrl = lhr.requestedUrl || lhr.finalUrl || '';
  let pagePath;
  try { pagePath = new URL(rawUrl).pathname || '/'; } catch { pagePath = rawUrl; }

  const seoScore = lhr.categories?.seo?.score;
  const score100 = seoScore != null ? Math.round(seoScore * 100) : '?';
  const scoreColor = score100 >= 90 ? GRN : score100 >= 70 ? YEL : RED;

  console.log('');
  console.log('  ' + BLD + CYN + ('Page: ' + pagePath).padEnd(36) + RST +
              'SEO Score: ' + BLD + scoreColor + score100 + '/100' + RST);
  console.log('  ' + '\u2500'.repeat(64));

  for (const [id, label] of SEO_CHECKS) {
    const audit = lhr.audits?.[id];
    if (!audit) {
      console.log('  ' + DIM + '\u2013  ' + label.padEnd(48) + 'n/a' + RST);
      grandNA++;
      continue;
    }

    const { score, scoreDisplayMode } = audit;
    let icon, color;

    if (scoreDisplayMode === 'notApplicable') {
      icon = '\u2013'; color = DIM; grandNA++;
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
                : '';

    console.log('  ' + color + icon + RST + '  ' + label.padEnd(48) + badge);

    if (icon === '\u2718' || icon === '\u26a0') {
      const items = audit.details?.items ?? [];
      const snippet = items
        .map(i => i.source || i.url || i.node?.snippet || '')
        .filter(Boolean).join(', ').slice(0, 120);
      if (snippet) console.log('     ' + DIM + '\u21b3 ' + snippet + RST);
    }
  }
}

console.log('');
console.log('  ' + BLD + CYN + '\u2500\u2500  Summary  ' + RST);
console.log('  ' + '\u2500'.repeat(64));
console.log('  ' + GRN + '\u2714  Passed : ' + grandPass + RST);
if (grandFail > 0) {
  console.log('  ' + RED + '\u2718  Failed : ' + grandFail + RST);
} else {
  console.log('  ' + DIM + '\u2718  Failed : 0' + RST);
}
if (grandNA > 0) {
  console.log('  ' + DIM + '\u2013  N/A    : ' + grandNA + RST);
}
console.log('');
console.log('  ' + DIM + 'Full reports: $OUT_DIR/' + RST);
console.log('');

if (grandFail > 0) process.exit(1);
NODEEOF
