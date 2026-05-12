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
#   --format json     Write a machine-readable JSON summary to
#                     lh-reports/<timestamp>/summary.json in addition to
#                     the normal colour output. Useful for CI scripts,
#                     dashboards, or piping into jq.
#
#   --compare [path]  Diff this run against a previous summary.json and print
#                     a regression report. Regressions exit with code 1.
#                     If path is omitted, the most recent previous run in
#                     lh-reports/ is used automatically. Implies --format json.
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
#
#   # Write JSON summary (piped into jq for pretty-print)
#   bash scripts/lighthouse-seo-audit.sh --format json | tail -0; cat lh-reports/*/summary.json | jq .
#
#   # Full CI-style run: specific pages + JSON output
#   bash scripts/lighthouse-seo-audit.sh --pages /,/blog,/pricing --format json
#
#   # Compare this run against the previous one (auto-discovered)
#   bash scripts/lighthouse-seo-audit.sh --compare
#
#   # Compare against a specific previous summary
#   bash scripts/lighthouse-seo-audit.sh --compare lh-reports/20260511-120000/summary.json
#
#   # CI regression gate: specific pages, JSON output, compare against baseline
#   bash scripts/lighthouse-seo-audit.sh --pages /,/blog --compare lh-reports/baseline/summary.json

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
PAGES_RAW=""    # comma-separated paths from --pages flag
FORMAT=""       # "json" to write machine-readable summary, empty for terminal-only
COMPARE_FILE="" # path to a previous summary.json, or "auto" to discover latest

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
    --format)
      [[ $# -gt 1 ]] || die "--format requires a value (currently only 'json' is supported)"
      FORMAT="$2"
      [[ "$FORMAT" == "json" ]] || die "Unknown format: '$FORMAT'. Only 'json' is supported."
      shift 2
      ;;
    --format=*)
      FORMAT="${1#--format=}"
      [[ "$FORMAT" == "json" ]] || die "Unknown format: '$FORMAT'. Only 'json' is supported."
      shift
      ;;
    --compare)
      # Optional value: if next arg exists and doesn't start with - it's the path
      if [[ $# -gt 1 && "${2:-}" != -* && -n "${2:-}" ]]; then
        COMPARE_FILE="$2"
        shift 2
      else
        COMPARE_FILE="auto"
        shift
      fi
      ;;
    --compare=*)
      COMPARE_FILE="${1#--compare=}"
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

# --compare implies --format json (we need summary.json to diff against)
[[ -n "$COMPARE_FILE" && -z "$FORMAT" ]] && FORMAT="json"

# Per-page audit timeout in seconds.
PAGE_TIMEOUT="${LH_TIMEOUT:-60}"

# Minimum Lighthouse performance score (0-100) — pages below this fail the budget.
PERF_MIN_SCORE="${PERF_MIN_SCORE:-80}"

h "Lighthouse SEO + Performance Audit — FintechPressHub"
echo -e "  Auditing:        ${BLD}${BASE_URL}${RST}"
echo -e "  Min perf score:  ${BLD}${PERF_MIN_SCORE}/100${RST}"
echo -e "  Budgets from:    ${BLD}performance-budget.json${RST}"
[[ -n "$FORMAT"       ]] && echo -e "  Output format:   ${BLD}${FORMAT}${RST}"
[[ -n "$COMPARE_FILE" ]] && echo -e "  Compare mode:    ${BLD}on${RST}"

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

# ── JSON summary output ───────────────────────────────────────────────────────
if [[ "$FORMAT" == "json" ]]; then
  JSON_OUT_FILE="$OUT_DIR/summary.json"
  h "Writing JSON Summary"

  node --input-type=module << NODEEOF
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const outDir     = '${OUT_DIR}';
const budgetFile = '${BUDGET_FILE}';
const minScore   = Number('${PERF_MIN_SCORE}');
const baseUrl    = '${BASE_URL}';
const jsonOut    = '${JSON_OUT_FILE}';

const budgets    = JSON.parse(readFileSync(budgetFile, 'utf8'));
const budget     = budgets[0] ?? {};

const TIMING_BUDGETS   = (budget.timings    ?? []).reduce((a, t) => { a[t.metric]       = t.budget;  return a; }, {});
const RESOURCE_BUDGETS = (budget.resourceSizes ?? []).reduce((a, r) => { a[r.resourceType] = r.budget;  return a; }, {});

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

const TIMING_META = {
  'first-contentful-paint':   { label: 'FCP', unit: 'ms' },
  'largest-contentful-paint': { label: 'LCP', unit: 'ms' },
  'cumulative-layout-shift':  { label: 'CLS', unit: ''   },
  'total-blocking-time':      { label: 'TBT', unit: 'ms' },
  'interactive':              { label: 'TTI', unit: 'ms' },
};

const RESOURCE_META = {
  script:     'JS bundle size',
  stylesheet: 'CSS bundle size',
  image:      'Image size',
  font:       'Font size',
  total:      'Total page weight',
};

const lhrFiles = readdirSync(outDir)
  .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
  .sort();

const pages = [];
let totalSeoPass = 0, totalSeoFail = 0, totalSeoManual = 0, totalSeoNA = 0;
let totalBudgetBreaches = 0;

for (const file of lhrFiles) {
  const lhr    = JSON.parse(readFileSync(join(outDir, file), 'utf8'));
  const rawUrl = lhr.requestedUrl || lhr.finalUrl || '';
  let pagePath;
  try { pagePath = new URL(rawUrl).pathname || '/'; } catch { pagePath = rawUrl; }

  const seoScore  = lhr.categories?.seo?.score;
  const perfScore = lhr.categories?.performance?.score;
  const seo100    = seoScore  != null ? Math.round(seoScore  * 100) : null;
  const perf100   = perfScore != null ? Math.round(perfScore * 100) : null;

  // ── SEO checks ─────────────────────────────────────────────────────────────
  const seoChecks = [];
  for (const [id, label] of SEO_CHECKS) {
    const audit = lhr.audits?.[id];
    if (!audit) { totalSeoNA++; seoChecks.push({ id, label, status: 'na' }); continue; }
    const { score, scoreDisplayMode } = audit;
    let status;
    if      (scoreDisplayMode === 'notApplicable') { status = 'na';     totalSeoNA++; }
    else if (scoreDisplayMode === 'manual')        { status = 'manual'; totalSeoManual++; }
    else if (score === 1)                          { status = 'pass';   totalSeoPass++; }
    else if (score == null || score === 0)         { status = 'fail';   totalSeoFail++; }
    else if (score < 1)                            { status = 'warn';   totalSeoFail++; }
    else                                           { status = 'pass';   totalSeoPass++; }

    const entry = { id, label, status };
    if (status === 'fail' || status === 'warn') {
      const items   = audit.details?.items ?? [];
      const snippet = items.map(i => i.source || i.url || i.node?.snippet || '').filter(Boolean).join(', ').slice(0, 200);
      if (snippet)            entry.snippet     = snippet;
      if (audit.explanation)  entry.explanation = audit.explanation.slice(0, 200);
    }
    seoChecks.push(entry);
  }

  // ── Performance score budget ────────────────────────────────────────────────
  const scorePassed = perf100 == null ? null : perf100 >= minScore;
  if (perf100 != null && !scorePassed) totalBudgetBreaches++;

  // ── Timings ────────────────────────────────────────────────────────────────
  const timings = [];
  for (const [auditId, meta] of Object.entries(TIMING_META)) {
    const audit     = lhr.audits?.[auditId];
    const budgetVal = TIMING_BUDGETS[auditId] ?? null;
    if (!audit || audit.numericValue == null) continue;
    const actual = audit.numericValue;
    const passed = budgetVal != null ? actual <= budgetVal : null;
    if (passed === false) totalBudgetBreaches++;
    timings.push({ metric: auditId, label: meta.label, unit: meta.unit,
                   actual: Math.round(actual * 1000) / 1000,
                   budget: budgetVal, passed });
  }

  // ── Resources ──────────────────────────────────────────────────────────────
  const resourceItems = lhr.audits?.['resource-summary']?.details?.items ?? [];
  const resourceMap   = {};
  for (const item of resourceItems) resourceMap[item.resourceType] = item.transferSize ?? item.size ?? 0;

  const resources = [];
  for (const [rType, label] of Object.entries(RESOURCE_META)) {
    const budgetKB  = RESOURCE_BUDGETS[rType] ?? null;
    if (budgetKB == null) continue;
    const bytes     = resourceMap[rType];
    if (bytes == null) continue;
    const actualKB  = Math.round((bytes / 1024) * 10) / 10;
    const passed    = actualKB <= budgetKB;
    if (!passed) totalBudgetBreaches++;
    resources.push({ type: rType, label, actualKB, budgetKB, passed });
  }

  pages.push({
    path: pagePath,
    url:  rawUrl,
    scores: { seo: seo100, performance: perf100 },
    seoChecks,
    budgets: {
      scoreCheck: { actual: perf100, min: minScore, passed: scorePassed },
      timings,
      resources,
    },
  });
}

const passed = totalSeoFail === 0 && totalBudgetBreaches === 0;

const summary = {
  timestamp:  new Date().toISOString(),
  baseUrl,
  reportsDir: outDir,
  minPerfScore: minScore,
  passed,
  summary: {
    seoChecks: { pass: totalSeoPass, fail: totalSeoFail, manual: totalSeoManual, na: totalSeoNA },
    budgetBreaches: totalBudgetBreaches,
  },
  pages,
};

writeFileSync(jsonOut, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log('  \x1b[32m✔\x1b[0m  summary.json written → ' + jsonOut);
console.log('');
console.log('  \x1b[2mPipe into jq:  cat ' + jsonOut + ' | jq .\x1b[0m');
console.log('  \x1b[2mFailed checks: cat ' + jsonOut + " | jq '[.pages[].seoChecks[] | select(.status == \"fail\")]'\x1b[0m");
console.log('  \x1b[2mBudget fails:  cat ' + jsonOut + " | jq '[.pages[].budgets.timings[] | select(.passed == false)]'\x1b[0m");
console.log('');
NODEEOF
fi

# ── Regression compare ────────────────────────────────────────────────────────
if [[ -n "$COMPARE_FILE" ]]; then
  JSON_OUT_FILE="$OUT_DIR/summary.json"
  h "Regression Report"

  node --input-type=module << NODEEOF
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m',
      CYN = '\x1b[36m', BLD = '\x1b[1m',  DIM = '\x1b[2m',  RST = '\x1b[0m';

const currentFile = '${JSON_OUT_FILE}';
const compareArg  = '${COMPARE_FILE}';
const lhReports   = '${ROOT}/lh-reports';

// ── Resolve the "previous" summary ───────────────────────────────────────────
let prevFile;
if (compareArg === 'auto') {
  // Find all summary.json files, exclude the current run's dir, pick the newest
  const currentDir = '${OUT_DIR}';
  let candidates = [];
  try {
    candidates = readdirSync(lhReports)
      .map(d => join(lhReports, d, 'summary.json'))
      .filter(f => existsSync(f) && resolve(join(lhReports, f.split('/').slice(-2)[0])) !== resolve(currentDir))
      .sort();   // dir names are timestamps — lexicographic sort = chronological
  } catch {}
  if (candidates.length === 0) {
    console.log('  ' + YEL + '⚠' + RST + '  No previous summary.json found in lh-reports/ — skipping compare.');
    console.log('  ' + DIM + '    Run the audit again after this run completes to get a diff.' + RST);
    console.log('');
    process.exit(0);
  }
  prevFile = candidates[candidates.length - 1];
} else {
  prevFile = compareArg;
}

if (!existsSync(prevFile)) {
  console.error(RED + '  ✘  Previous summary not found: ' + prevFile + RST);
  process.exit(1);
}
if (!existsSync(currentFile)) {
  console.error(RED + '  ✘  Current summary not found: ' + currentFile + RST);
  console.error(DIM + '    (--compare requires --format json or auto-enables it)' + RST);
  process.exit(1);
}

const prev = JSON.parse(readFileSync(prevFile, 'utf8'));
const curr = JSON.parse(readFileSync(currentFile, 'utf8'));

console.log('  ' + DIM + 'Previous: ' + prevFile + RST);
console.log('  ' + DIM + 'Current:  ' + currentFile + RST);

// ── Helpers ───────────────────────────────────────────────────────────────────
const arrow = (delta, lowerIsBetter = true) => {
  if (delta === 0 || delta == null) return DIM + '  →  ' + RST;
  const worse = lowerIsBetter ? delta > 0 : delta < 0;
  return worse ? RED + '  ▲  ' + RST : GRN + '  ▼  ' + RST;
};
const scoreArrow = (delta) => {
  if (delta === 0 || delta == null) return DIM + '  →  ' + RST;
  return delta > 0 ? GRN + '  ▲  ' + RST : RED + '  ▼  ' + RST;
};
const fmtDelta = (delta, unit = '') => {
  if (delta == null) return '';
  const sign = delta > 0 ? '+' : '';
  return DIM + '(' + sign + delta + unit + ')' + RST;
};
const pct = (curr, prev) => {
  if (!prev) return '';
  const d = Math.round(((curr - prev) / prev) * 100);
  const sign = d > 0 ? '+' : '';
  return DIM + ' ' + sign + d + '%' + RST;
};

// ── Index pages by path ───────────────────────────────────────────────────────
const prevPages = Object.fromEntries((prev.pages ?? []).map(p => [p.path, p]));
const currPages = Object.fromEntries((curr.pages ?? []).map(p => [p.path, p]));
const allPaths  = [...new Set([...Object.keys(prevPages), ...Object.keys(currPages)])].sort();

let totalRegressions = 0;
let totalFixes       = 0;

for (const path of allPaths) {
  const p = prevPages[path];
  const c = currPages[path];

  if (!p) { console.log('\n  ' + GRN + '+ New page: ' + path + RST); continue; }
  if (!c) { console.log('\n  ' + YEL + '- Removed page: ' + path + RST); continue; }

  console.log('');
  console.log('  ' + BLD + CYN + 'Page: ' + path + RST);
  console.log('  ' + '\u2500'.repeat(62));

  // ── Scores ─────────────────────────────────────────────────────────────────
  for (const [key, label] of [['seo', 'SEO score'], ['performance', 'Performance score']]) {
    const pv = p.scores?.[key], cv = c.scores?.[key];
    if (pv == null && cv == null) continue;
    const delta = (cv != null && pv != null) ? cv - pv : null;
    const col   = delta == null ? DIM : delta > 0 ? GRN : delta < 0 ? RED : DIM;
    console.log(
      '  ' + col + label.padEnd(32) + RST +
      (pv ?? '?') + '/100' + scoreArrow(delta) + (cv ?? '?') + '/100  ' +
      fmtDelta(delta, 'pts')
    );
    if (delta != null && delta < 0) totalRegressions++;
  }

  // ── SEO check status changes ────────────────────────────────────────────────
  const prevSeo = Object.fromEntries((p.seoChecks ?? []).map(c => [c.id, c.status]));
  const currSeo = Object.fromEntries((c.seoChecks ?? []).map(c => [c.id, c.status]));
  const seoIds  = [...new Set([...Object.keys(prevSeo), ...Object.keys(currSeo)])];

  for (const id of seoIds) {
    const ps = prevSeo[id], cs = currSeo[id];
    if (ps === cs) continue;                                     // unchanged — skip
    const wasOk  = ps === 'pass';
    const isOk   = cs === 'pass';
    const wasNeutral = ps === 'manual' || ps === 'na';
    const isNeutral  = cs === 'manual' || cs === 'na';
    if (wasNeutral && isNeutral) continue;                       // both neutral — skip

    const check = (c.seoChecks ?? []).find(x => x.id === id);
    const label = check?.label ?? id;
    if (!isOk && wasOk) {
      console.log('  ' + RED + '✘  REGRESSION  ' + RST + label + '  ' + DIM + ps + ' → ' + cs + RST);
      if (check?.snippet)     console.log('     ' + DIM + '↳ ' + check.snippet + RST);
      if (check?.explanation) console.log('     ' + DIM + '↳ ' + check.explanation + RST);
      totalRegressions++;
    } else if (isOk && !wasOk) {
      console.log('  ' + GRN + '✔  FIXED       ' + RST + label + '  ' + DIM + ps + ' → ' + cs + RST);
      totalFixes++;
    } else {
      console.log('  ' + YEL + '⚠  CHANGED     ' + RST + label + '  ' + DIM + ps + ' → ' + cs + RST);
    }
  }

  // ── Timing deltas ───────────────────────────────────────────────────────────
  const prevTimings = Object.fromEntries((p.budgets?.timings ?? []).map(t => [t.metric, t]));
  const currTimings = Object.fromEntries((c.budgets?.timings ?? []).map(t => [t.metric, t]));

  for (const metric of Object.keys(currTimings)) {
    const pt = prevTimings[metric], ct = currTimings[metric];
    if (!pt) continue;
    const delta    = Math.round((ct.actual - pt.actual) * 1000) / 1000;
    const unit     = ct.unit || '';
    const worse    = delta > 0;                           // higher = slower = worse
    const col      = delta === 0 ? DIM : worse ? RED : GRN;
    const budgetOk = ct.passed !== false;
    const flag     = !budgetOk ? '  ' + RED + '> budget' + RST : '';
    if (delta === 0) continue;
    if (worse && delta > 0) totalRegressions++;
    console.log(
      '  ' + col + (worse ? '▲' : '▼') + RST + '  ' +
      (ct.label ?? metric).padEnd(30) +
      String(pt.actual + unit).padStart(12) + arrow(delta) +
      String(ct.actual + unit).padEnd(12) +
      fmtDelta(delta, unit) + pct(ct.actual, pt.actual) + flag
    );
  }

  // ── Resource deltas ─────────────────────────────────────────────────────────
  const prevRes = Object.fromEntries((p.budgets?.resources ?? []).map(r => [r.type, r]));
  const currRes = Object.fromEntries((c.budgets?.resources ?? []).map(r => [r.type, r]));

  for (const rType of Object.keys(currRes)) {
    const pr = prevRes[rType], cr = currRes[rType];
    if (!pr) continue;
    const delta  = Math.round((cr.actualKB - pr.actualKB) * 10) / 10;
    const worse  = delta > 0;
    const col    = delta === 0 ? DIM : worse ? RED : GRN;
    const flag   = !cr.passed ? '  ' + RED + '> budget' + RST : '';
    if (delta === 0) continue;
    if (worse && delta > 50) totalRegressions++;  // only flag meaningful size increases (>50 KB)
    console.log(
      '  ' + col + (worse ? '▲' : '▼') + RST + '  ' +
      (cr.label ?? rType).padEnd(30) +
      String(pr.actualKB + ' KB').padStart(12) + arrow(delta) +
      String(cr.actualKB + ' KB').padEnd(12) +
      fmtDelta(delta, ' KB') + pct(cr.actualKB, pr.actualKB) + flag
    );
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log('  ' + BLD + CYN + '\u2500\u2500  Compare Summary  ' + RST);
console.log('  ' + '\u2500'.repeat(62));
if (totalRegressions === 0 && totalFixes === 0) {
  console.log('  ' + DIM + '\u2013  No changes detected between runs.' + RST);
} else {
  if (totalFixes > 0)
    console.log('  ' + GRN + '\u2714  Fixes      : ' + totalFixes + RST);
  if (totalRegressions > 0)
    console.log('  ' + RED + '\u2718  Regressions: ' + totalRegressions + RST);
}
console.log('');

if (totalRegressions > 0) process.exitCode = 1;
NODEEOF
fi
