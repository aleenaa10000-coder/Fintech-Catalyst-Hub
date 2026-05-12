#!/usr/bin/env bash
# scripts/lighthouse-seo-audit.sh
#
# Run a Lighthouse SEO + Performance audit against the running FintechPressHub
# dev server and print a colour-coded summary of every SEO check plus a
# performance budget gate.
#
# Usage:
#   bash scripts/lighthouse-seo-audit.sh [OPTIONS] [BASE_URL]
#
# Options:
#   --pages <paths>   Comma-separated list of paths to audit.
#                     Example: --pages /,/blog,/pricing
#                     Defaults to: /,/blog,/services,/pricing
#
# BASE_URL defaults to http://localhost:5000
#
# NOTE: Always use http://localhost:5000 (NOT the .replit.dev URL).
# Replit's proxy adds x-robots-tag: noindex to all .replit.dev responses,
# causing a false is-crawlable failure. localhost bypasses the proxy.
#
# Reports (JSON) are saved to lh-reports/<timestamp>/
#
# Performance budgets are read from performance-budget.json at the repo root.
# The script exits with code 1 if any SEO check fails OR any budget is breached.
#
# Environment variables:
#   LH_TIMEOUT      Per-page audit timeout in seconds (default: 60)
#   PERF_MIN_SCORE  Minimum Lighthouse performance score 0-100 (default: 80)
#
# Examples:
#   # Default pages
#   bash scripts/lighthouse-seo-audit.sh
#
#   # Single blog post
#   bash scripts/lighthouse-seo-audit.sh --pages /blog/fintech-seo-strategy-2026
#
#   # Multiple specific routes
#   bash scripts/lighthouse-seo-audit.sh --pages /,/glossary/api,/locations/london
#
#   # Custom base URL + specific pages
#   bash scripts/lighthouse-seo-audit.sh --pages /pricing http://localhost:5000
#
#   # Stricter performance gate with longer timeout
#   LH_TIMEOUT=120 PERF_MIN_SCORE=90 bash scripts/lighthouse-seo-audit.sh --pages /,/blog

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
BASE_URL=""
PAGES_RAW=""   # comma-separated paths from --pages flag

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pages)
      [[ $# -gt 1 ]] || die "--pages requires a value (comma-separated paths, e.g. /,/blog,/pricing)"
      PAGES_RAW="$2"
      shift 2
      ;;
    --pages=*)
      PAGES_RAW="${1#--pages=}"
      shift
      ;;
    --help|-h)
      sed -n '2,/^set -/{ /^set -/d; s/^# \{0,1\}//; p }' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    -*)
      die "Unknown flag: $1 (run with --help to see usage)"
      ;;
    *)
      # First positional arg is the base URL
      [[ -z "$BASE_URL" ]] || die "Unexpected argument: $1"
      BASE_URL="$1"
      shift
      ;;
  esac
done

BASE_URL="${BASE_URL:-http://localhost:5000}"
BASE_URL="${BASE_URL%/}"

# Per-page audit timeout in seconds.
PAGE_TIMEOUT="${LH_TIMEOUT:-60}"

# Minimum Lighthouse performance score (0-100) — pages below this fail the budget.
PERF_MIN_SCORE="${PERF_MIN_SCORE:-80}"

h "Lighthouse SEO + Performance Audit — FintechPressHub"
echo -e "  Auditing:        ${BLD}${BASE_URL}${RST}"
echo -e "  Min perf score:  ${BLD}${PERF_MIN_SCORE}/100${RST}"
echo -e "  Budgets from:    ${BLD}performance-budget.json${RST}"

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

BUDGET_FILE="$ROOT/performance-budget.json"
[[ -f "$BUDGET_FILE" ]] || die "performance-budget.json not found at repo root."
ok "performance-budget.json found"

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
# Build PAGES array from --pages flag (comma-separated) or fall back to defaults.
if [[ -n "$PAGES_RAW" ]]; then
  IFS=',' read -ra PAGES <<< "$PAGES_RAW"
  # Trim spaces and ensure each path starts with /
  for i in "${!PAGES[@]}"; do
    PAGES[$i]="${PAGES[$i]// /}"
    [[ "${PAGES[$i]}" == /* ]] || PAGES[$i]="/${PAGES[$i]}"
  done
else
  PAGES=("/" "/blog" "/services" "/pricing")
fi

echo -e "  Pages (${#PAGES[@]}):       ${BLD}${PAGES[*]}${RST}"
info "Auditing ${#PAGES[@]} pages — reports → lh-reports/$TIMESTAMP/"

# ── Collect reports ───────────────────────────────────────────────────────────
h "Collecting  (SEO + Performance, no throttling)"
echo ""

CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --headless=new --disable-gpu"
FAILED_PAGES=()

for PAGE in "${PAGES[@]}"; do
  URL="${BASE_URL}${PAGE}"
  echo -e "  Auditing ${BLD}${URL}${RST} ..."

  if timeout "$PAGE_TIMEOUT" "$LHCI" collect \
      --url="$URL" \
      --n=1 \
      --no-lighthouserc \
      --chromePath="$CHROME" \
      --settings.onlyCategories=seo,performance \
      --settings.chromeFlags="$CHROME_FLAGS" \
      --settings.throttlingMethod=provided \
      2>&1 | grep -v '^$' | sed 's/^/    /'; then

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

  rm -f "$LHCI_DIR"/flags-*.json "$LHCI_DIR"/lhr-*.html 2>/dev/null || true
done

if [[ ${#FAILED_PAGES[@]} -gt 0 ]]; then
  warn "Pages skipped due to timeout: ${FAILED_PAGES[*]}"
  warn "Re-run with: LH_TIMEOUT=120 bash scripts/lighthouse-seo-audit.sh"
fi

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
console.log('  ' + BLD + CYN + '\u2500\u2500  SEO Summary  ' + RST);
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

if (grandFail > 0) process.exitCode = 1;
NODEEOF

# ── Performance Budget Check ──────────────────────────────────────────────────
h "Performance Budget"

node --input-type=module << NODEEOF
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const outDir      = '${OUT_DIR}';
const budgetFile  = '${BUDGET_FILE}';
const minScore    = Number('${PERF_MIN_SCORE}');

const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m',
      CYN = '\x1b[36m', BLD = '\x1b[1m',  DIM = '\x1b[2m',  RST = '\x1b[0m';

// ── Load budget ───────────────────────────────────────────────────────────────
const budgets = JSON.parse(readFileSync(budgetFile, 'utf8'));
// Use the first budget entry (applies to /* — all pages)
const budget = budgets[0] ?? {};

// Map metric IDs → { label, budget (ms or raw), unit }
const TIMING_BUDGETS = (budget.timings ?? []).reduce((acc, t) => {
  acc[t.metric] = { budget: t.budget };
  return acc;
}, {});

const RESOURCE_BUDGETS = (budget.resourceSizes ?? []).reduce((acc, r) => {
  acc[r.resourceType] = { budgetKB: r.budget };
  return acc;
}, {});

// ── Metric display config ─────────────────────────────────────────────────────
const TIMING_META = {
  'first-contentful-paint':   { label: 'First Contentful Paint (FCP)', unit: 'ms',  fmt: v => Math.round(v) + ' ms' },
  'largest-contentful-paint': { label: 'Largest Contentful Paint (LCP)', unit: 'ms', fmt: v => Math.round(v) + ' ms' },
  'cumulative-layout-shift':  { label: 'Cumulative Layout Shift (CLS)',  unit: '',   fmt: v => v.toFixed(3) },
  'total-blocking-time':      { label: 'Total Blocking Time (TBT)',      unit: 'ms', fmt: v => Math.round(v) + ' ms' },
  'interactive':              { label: 'Time to Interactive (TTI)',      unit: 'ms', fmt: v => Math.round(v) + ' ms' },
};

const RESOURCE_META = {
  script:     { label: 'JS bundle size' },
  stylesheet: { label: 'CSS bundle size' },
  image:      { label: 'Image size' },
  font:       { label: 'Font size' },
  total:      { label: 'Total page weight' },
};

// ── Process reports ───────────────────────────────────────────────────────────
const lhrFiles = readdirSync(outDir)
  .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
  .sort();

let budgetBreaches = 0;

for (const file of lhrFiles) {
  const lhr  = JSON.parse(readFileSync(join(outDir, file), 'utf8'));
  const rawUrl = lhr.requestedUrl || lhr.finalUrl || '';
  let pagePath;
  try { pagePath = new URL(rawUrl).pathname || '/'; } catch { pagePath = rawUrl; }

  const perfScore  = lhr.categories?.performance?.score;
  const perf100    = perfScore != null ? Math.round(perfScore * 100) : null;
  const scoreColor = perf100 == null ? DIM
                   : perf100 >= minScore ? GRN
                   : perf100 >= minScore * 0.85 ? YEL : RED;

  const scoreBadge = perf100 == null
    ? DIM + 'n/a' + RST
    : BLD + scoreColor + perf100 + '/100' + RST +
      (perf100 < minScore
        ? '  ' + RED + 'FAIL (min: ' + minScore + ')' + RST
        : '  ' + GRN + 'PASS' + RST);

  console.log('');
  console.log(
    '  ' + BLD + CYN + ('Page: ' + pagePath).padEnd(36) + RST +
    'Perf Score: ' + scoreBadge
  );
  console.log('  ' + '\u2500'.repeat(62));

  if (perf100 != null && perf100 < minScore) budgetBreaches++;

  // ── Core Web Vitals vs timings budget ────────────────────────────────────
  for (const [auditId, meta] of Object.entries(TIMING_META)) {
    const audit  = lhr.audits?.[auditId];
    const bEntry = TIMING_BUDGETS[auditId];
    if (!audit || audit.numericValue == null) {
      if (bEntry) console.log('  ' + DIM + '\u2013  ' + meta.label.padEnd(38) + 'no data' + RST);
      continue;
    }

    const actual = audit.numericValue;
    const budgetVal = bEntry?.budget;
    const fmtActual = meta.fmt(actual);

    if (budgetVal == null) {
      // No budget configured for this metric — show value only
      console.log('  ' + DIM + '\u2013  ' + meta.label.padEnd(38) + fmtActual + '  (no budget set)' + RST);
      continue;
    }

    const fmtBudget = meta.fmt(budgetVal);
    const passed    = actual <= budgetVal;
    const icon      = passed ? '\u2714' : '\u2718';
    const color     = passed ? GRN : RED;
    const tag       = passed
      ? GRN + 'PASS' + RST
      : RED + 'FAIL' + RST;

    if (!passed) budgetBreaches++;

    console.log(
      '  ' + color + icon + RST + '  ' +
      meta.label.padEnd(38) +
      fmtActual.padStart(10) + '  budget: ' + fmtBudget + '  ' + tag
    );
  }

  // ── Resource sizes vs budget ──────────────────────────────────────────────
  const resourceAudit = lhr.audits?.['resource-summary'];
  const resourceItems = resourceAudit?.details?.items ?? [];
  const resourceMap   = {};
  for (const item of resourceItems) {
    // transferSize is the compressed on-wire size; size is uncompressed.
    // Budget uses compressed (transferSize) to match what users actually download.
    resourceMap[item.resourceType] = item.transferSize ?? item.size ?? 0;
  }

  for (const [rType, meta] of Object.entries(RESOURCE_META)) {
    const bEntry = RESOURCE_BUDGETS[rType];
    if (!bEntry) continue;

    const actualBytes = resourceMap[rType];
    if (actualBytes == null) {
      console.log('  ' + DIM + '\u2013  ' + meta.label.padEnd(38) + 'no data' + RST);
      continue;
    }

    const actualKB  = actualBytes / 1024;
    const budgetKB  = bEntry.budgetKB;
    const passed    = actualKB <= budgetKB;
    const icon      = passed ? '\u2714' : '\u2718';
    const color     = passed ? GRN : RED;
    const tag       = passed ? GRN + 'PASS' + RST : RED + 'FAIL' + RST;

    if (!passed) budgetBreaches++;

    console.log(
      '  ' + color + icon + RST + '  ' +
      meta.label.padEnd(38) +
      (actualKB.toFixed(1) + ' KB').padStart(10) +
      '  budget: ' + budgetKB + ' KB  ' + tag
    );
  }
}

// ── Budget summary ────────────────────────────────────────────────────────────
console.log('');
console.log('  ' + BLD + CYN + '\u2500\u2500  Budget Summary  ' + RST);
console.log('  ' + '\u2500'.repeat(62));
if (budgetBreaches === 0) {
  console.log('  ' + GRN + '\u2714  All performance budgets passed.' + RST);
} else {
  console.log('  ' + RED + '\u2718  ' + budgetBreaches + ' budget breach(es) detected.' + RST);
  console.log('  ' + DIM + '     Adjust thresholds in performance-budget.json or fix the regressions.' + RST);
}
console.log('');
console.log('  ' + DIM + 'Reports saved to: lh-reports/${TIMESTAMP}/' + RST);
console.log('');

if (budgetBreaches > 0) process.exitCode = 1;
NODEEOF
