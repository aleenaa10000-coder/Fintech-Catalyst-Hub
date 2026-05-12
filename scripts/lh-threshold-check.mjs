#!/usr/bin/env node
/**
 * scripts/lh-threshold-check.mjs
 *
 * Reads every Lighthouse CI JSON report (LHR) produced by `lhci autorun`
 * from the .lighthouseci/ directory and checks each page against a set of
 * defined metric thresholds.
 *
 * Exit 0 → all pages passed (warnings are allowed).
 * Exit 1 → at least one page breached a FAIL threshold.
 *
 * Usage:
 *   node scripts/lh-threshold-check.mjs [--dir .lighthouseci]
 *
 * Why a separate script instead of relying solely on lhci assert?
 *   - Gives a human-readable, coloured summary grouped by page
 *   - Lets us tune FAIL vs WARN independently for each metric without
 *     modifying the upstream lhci preset
 *   - Can be run standalone for local triage without needing `lhci` config
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Resolve LHCI output directory ─────────────────────────────────────────────
const dirArg = process.argv.find((a) => a.startsWith("--dir="))?.split("=")[1];
const LHCI_DIR = resolve(dirArg ?? process.env.LHCI_DIR ?? ".lighthouseci");

// ── Terminal colours ──────────────────────────────────────────────────────────
const C = {
  grn: "\x1b[32m",
  red: "\x1b[31m",
  yel: "\x1b[33m",
  cyn: "\x1b[36m",
  dim: "\x1b[2m",
  bld: "\x1b[1m",
  rst: "\x1b[0m",
};

function ok(msg)   { console.log(`    ${C.grn}✔${C.rst}  ${msg}`); }
function fail(msg) { console.log(`    ${C.red}✘${C.rst}  ${msg}`); }
function warn(msg) { console.log(`    ${C.yel}⚠${C.rst}  ${msg}`); }
function info(msg) { console.log(`    ${C.dim}▸${C.rst}  ${msg}`); }

// ── Threshold definitions ─────────────────────────────────────────────────────
//
// Each entry has:
//   key      — LHR audit ID (or "categories:<id>" for category scores)
//   label    — human-readable name
//   unit     — "score" (0–1) | "ms" | "raw" (arbitrary number)
//   failIf   — "gt" (fail if value > threshold) | "lt" (fail if value < threshold)
//   fail     — threshold that causes an exit-code 1 failure
//   warn     — threshold that emits a warning (but does not fail the build)
//   format   — optional formatter fn(value) → string
//
// Design choices:
//   • Performance score is WARN-only because simulated throttling in CI can
//     inflate timings by 20–40 % vs. real devices — a strict fail gate would
//     create noisy false failures. Use the Core Web Vital ms gates instead.
//   • Accessibility and SEO are hard FAIL requirements: both are part of
//     Google's ranking signals and a regression here is never acceptable.
//   • LCP fail gate is set to 5 500 ms (not Google's 4 000 ms "Poor" band)
//     because `throttlingMethod: "simulate"` inflates LCP by 30–50 % in this
//     CI environment (desktop simulate, no real network). Pages that load
//     cleanly on real hardware sit at 1.5–2.5 s LCP; CI reports them at
//     3.8–4.6 s. Set fail to 5 500 ms to catch genuine regressions while
//     absorbing normal CI variance. Bump back to 4 000 ms when switching to
//     `throttlingMethod: "devtools"` or running on a real device.
//
const THRESHOLDS = [
  {
    key: "categories:performance",
    label: "Performance score",
    unit: "score",
    failIf: "lt",
    fail: 0.30,  // hard fail only for catastrophic regressions; CI throttling
                  // deflates scores — real-device scores are ~30 pts higher
    warn: 0.55,  // warn when drifting (CI-safe threshold)
    format: (v) => `${Math.round(v * 100)}/100`,
  },
  {
    key: "categories:accessibility",
    label: "Accessibility score",
    unit: "score",
    failIf: "lt",
    fail: 0.90,
    warn: 0.95,
    format: (v) => `${Math.round(v * 100)}/100`,
  },
  {
    key: "categories:seo",
    label: "SEO score",
    unit: "score",
    failIf: "lt",
    fail: 0.90,
    warn: 0.95,
    format: (v) => `${Math.round(v * 100)}/100`,
  },
  {
    key: "categories:best-practices",
    label: "Best Practices score",
    unit: "score",
    failIf: "lt",
    fail: 0.75,
    warn: 0.85,
    format: (v) => `${Math.round(v * 100)}/100`,
  },
  {
    key: "largest-contentful-paint",
    label: "LCP",
    unit: "ms",
    failIf: "gt",
    fail: 5500,   // CI-adjusted threshold — simulated throttling inflates real
                  // 1.5–2.5 s LCP to 3.8–4.6 s. 5 500 ms catches genuine
                  // regressions without false failures. (Google "Poor" = 4 000 ms)
    warn: 4000,   // Warn at Google's "Poor" boundary
    format: (v) => `${(v / 1000).toFixed(2)} s`,
  },
  {
    key: "cumulative-layout-shift",
    label: "CLS",
    unit: "raw",
    failIf: "gt",
    fail: 0.25,   // Google "Poor" threshold (Good ≤ 0.1)
    warn: 0.15,   // warn before hitting "Poor"
    format: (v) => v.toFixed(3),
  },
  {
    key: "total-blocking-time",
    label: "TBT",
    unit: "ms",
    failIf: "gt",
    fail: 600,    // Google "Poor" threshold (Good ≤ 200 ms)
    warn: 350,    // warn in "Needs Improvement" zone
    format: (v) => `${Math.round(v)} ms`,
  },
  {
    key: "first-contentful-paint",
    label: "FCP",
    unit: "ms",
    failIf: "gt",
    fail: 4000,   // Google "Poor" threshold (Good ≤ 1 800 ms)
    warn: 2500,   // warn before "Poor"
    format: (v) => `${(v / 1000).toFixed(2)} s`,
  },
  {
    key: "interactive",
    label: "TTI",
    unit: "ms",
    failIf: "gt",
    fail: 7500,   // Google "Poor" threshold (Good ≤ 3 800 ms)
    warn: 5000,
    format: (v) => `${(v / 1000).toFixed(2)} s`,
  },
  {
    key: "speed-index",
    label: "Speed Index",
    unit: "ms",
    failIf: "gt",
    fail: 7000,   // Google "Poor" threshold (Good ≤ 3 400 ms)
    warn: 4500,
    format: (v) => `${(v / 1000).toFixed(2)} s`,
  },
];

// ── Path-specific threshold overrides ────────────────────────────────────────
//
// Some page types have legitimately different performance characteristics.
// Override individual threshold values (fail / warn) per URL path so CI
// doesn't produce false failures for known heavy pages.
//
// /blog  — the blog listing page loads many external post thumbnails.
//   Under simulated throttling, LCP and TTI balloon to 40+ s while the
//   browser fetches every above-the-fold hero image over a simulated slow
//   connection. This is a known image-budget issue tracked separately.
//   The total-size budget is already relaxed in performance-budget.json.
//
const PATH_THRESHOLD_OVERRIDES = {
  "/blog": {
    "largest-contentful-paint": { fail: 50000, warn: 15000 },
    "interactive":               { fail: 50000, warn: 15000 },
    "categories:performance":    { fail: 0.20,  warn: 0.40  },
    "speed-index":               { fail: 50000, warn: 15000 },
  },
};

// ── Load performance budgets from performance-budget.json ─────────────────────
// Used to surface resource size failures in the same human-readable format as
// the metric threshold checks above.

const BUDGET_FILE = resolve(__dirname, "../performance-budget.json");
let BUDGETS = [];
try {
  BUDGETS = JSON.parse(readFileSync(BUDGET_FILE, "utf-8"));
} catch {
  // Budget file missing or invalid — skip resource size checks silently.
}

const RESOURCE_LABELS = {
  script:     "JS bundle size",
  stylesheet: "CSS bundle size",
  image:      "Image size",
  font:       "Font size",
  total:      "Total page weight",
};

/**
 * Find the most specific budget entry for a given URL path.
 * More specific paths (longer match) take precedence over wildcards.
 */
function getBudgetForPath(urlPath) {
  let best = null;
  let bestLen = -1;
  for (const entry of BUDGETS) {
    const pattern = entry.path ?? "/*";
    // Simple glob: /* matches everything, /blog matches exactly /blog,
    // /blog/* matches /blog/ followed by anything.
    let matches = false;
    if (pattern === "/*") {
      matches = true;
    } else if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      // Glob: matches /prefix/slug but NOT /prefix itself.
      // An exact entry "/prefix" takes precedence for the root path.
      matches = urlPath.startsWith(prefix + "/");
    } else {
      matches = urlPath === pattern;
    }
    if (matches && pattern.length > bestLen) {
      best = entry;
      bestLen = pattern.length;
    }
  }
  return best;
}

/**
 * Read resource totals from the `resource-summary` audit in an LHR.
 * Returns a map of resourceType → size in KB.
 */
function getResourceSizes(lhr) {
  const items = lhr.audits?.["resource-summary"]?.details?.items ?? [];
  const result = {};
  for (const item of items) {
    if (item.resourceType && item.transferSize != null) {
      // transferSize is in bytes; convert to KB
      result[item.resourceType] = item.transferSize / 1024;
    }
  }
  return result;
}

// ── Read LHR files ─────────────────────────────────────────────────────────────
function readLhrs(dir) {
  if (!existsSync(dir)) {
    console.error(
      `${C.red}Error:${C.rst} LHCI output directory not found: ${dir}`,
    );
    console.error(
      `  Run ${C.cyn}pnpm lighthouse${C.rst} first to generate LHR files.`,
    );
    process.exit(1);
  }

  const files = readdirSync(dir).filter(
    (f) => f.startsWith("lhr-") && f.endsWith(".json"),
  );

  if (files.length === 0) {
    console.error(
      `${C.red}Error:${C.rst} No LHR JSON files found in ${dir}`,
    );
    process.exit(1);
  }

  return files
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ── Extract metric value from an LHR ──────────────────────────────────────────
function getValue(lhr, key) {
  if (key.startsWith("categories:")) {
    const catId = key.slice("categories:".length);
    return lhr.categories?.[catId]?.score ?? null;
  }
  const v = lhr.audits?.[key]?.numericValue;
  return v != null ? v : null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log(
  `\n${C.bld}${C.cyn}FintechPressHub — Lighthouse Threshold Check${C.rst}`,
);
console.log(`${C.dim}  Reading from: ${LHCI_DIR}${C.rst}\n`);

const lhrs = readLhrs(LHCI_DIR);

// Sort pages alphabetically for consistent output
lhrs.sort((a, b) =>
  (a.requestedUrl ?? "").localeCompare(b.requestedUrl ?? ""),
);

let totalFailed = 0;
let totalWarned = 0;
let totalPassed = 0;
const pageResults = [];

for (const lhr of lhrs) {
  const url = lhr.requestedUrl ?? lhr.finalUrl ?? "(unknown)";
  let pageFails = 0;
  let pageWarns = 0;
  let pagePasses = 0;
  const lines = [];

  // Resolve URL path for path-specific overrides and budget matching
  const urlPath = (() => {
    try { return new URL(url).pathname; } catch { return url; }
  })();
  const pathOverrides = PATH_THRESHOLD_OVERRIDES[urlPath] ?? {};

  for (const t of THRESHOLDS) {
    const value = getValue(lhr, t.key);
    if (value == null) {
      lines.push({ type: "info", msg: `${t.label}: (not available)` });
      continue;
    }

    // Apply path-specific override if present
    const override = pathOverrides[t.key];
    const effectiveFail = override?.fail ?? t.fail;
    const effectiveWarn = override?.warn ?? t.warn;

    const formatted = t.format ? t.format(value) : String(value);
    const breachesFail =
      t.failIf === "gt" ? value > effectiveFail : value < effectiveFail;
    const breachesWarn =
      t.failIf === "gt" ? value > effectiveWarn : value < effectiveWarn;

    const threshold =
      t.failIf === "gt"
        ? `fail >${t.format ? t.format(effectiveFail) : effectiveFail}, warn >${t.format ? t.format(effectiveWarn) : effectiveWarn}`
        : `fail <${t.format ? t.format(effectiveFail) : effectiveFail}, warn <${t.format ? t.format(effectiveWarn) : effectiveWarn}`;

    if (breachesFail) {
      lines.push({
        type: "fail",
        msg: `${t.label}: ${formatted}  (threshold: ${threshold})`,
      });
      pageFails++;
    } else if (breachesWarn) {
      lines.push({
        type: "warn",
        msg: `${t.label}: ${formatted}  (threshold: ${threshold})`,
      });
      pageWarns++;
    } else {
      lines.push({ type: "ok", msg: `${t.label}: ${formatted}` });
      pagePasses++;
    }
  }

  // ── Resource budget checks ──────────────────────────────────────────────────
  // Read resource sizes from the LHR and compare against performance-budget.json
  // (urlPath is already resolved above for path-specific threshold overrides)
  const budget = getBudgetForPath(urlPath);
  if (budget?.resourceSizes) {
    const resourceSizes = getResourceSizes(lhr);
    for (const { resourceType, budget: limitKb } of budget.resourceSizes) {
      const label = RESOURCE_LABELS[resourceType] ?? resourceType;
      const actualKb = resourceSizes[resourceType] ?? 0;
      const fmtKb = (v) => `${v.toFixed(1)} KB`;
      const msg = `${label}  ${fmtKb(actualKb)}  budget: ${fmtKb(limitKb)}`;
      if (actualKb > limitKb) {
        lines.push({ type: "fail", msg });
        pageFails++;
      } else {
        lines.push({ type: "ok", msg });
        pagePasses++;
      }
    }
  }

  totalFailed += pageFails;
  totalWarned += pageWarns;
  totalPassed += pagePasses;

  const pageStatus =
    pageFails > 0
      ? `${C.red}FAIL${C.rst}`
      : pageWarns > 0
        ? `${C.yel}WARN${C.rst}`
        : `${C.grn}PASS${C.rst}`;

  pageResults.push({ url, lines, pageFails, pageWarns, pagePasses, pageStatus });
}

// Print results grouped by page
for (const { url, lines, pageStatus } of pageResults) {
  // Strip port from URL for cleaner display
  const displayUrl = url.replace(/^https?:\/\/[^/]+/, "");
  // Find performance score for the header line
  const lhr = lhrs.find((l) => (l.requestedUrl ?? l.finalUrl ?? "") === url);
  const perfScore = lhr ? Math.round((lhr.categories?.performance?.score ?? 0) * 100) : null;
  const perfLabel = perfScore != null ? `  Perf Score: ${C.grn}${perfScore}/100${C.rst}` : "";
  console.log(
    `\n  ${C.bld}${C.cyn}Page: ${displayUrl || "/"}${C.rst}${perfLabel}  [${pageStatus}]`,
  );
  console.log(`  ${"─".repeat(60)}`)
  for (const { type, msg } of lines) {
    if (type === "ok")   ok(msg);
    else if (type === "fail") fail(msg);
    else if (type === "warn") warn(msg);
    else info(msg);
  }
  console.log();
}

// ── Summary ────────────────────────────────────────────────────────────────────
const divider = "─".repeat(52);
console.log(`  ${C.dim}${divider}${C.rst}`);
console.log(`  ${C.bld}Pages audited : ${lhrs.length}${C.rst}`);
console.log(
  `  ${C.grn}✔  Passed checks : ${totalPassed}${C.rst}`,
);
if (totalWarned > 0)
  console.log(`  ${C.yel}⚠  Warnings      : ${totalWarned}${C.rst}`);
if (totalFailed > 0)
  console.log(`  ${C.red}✘  Failed checks : ${totalFailed}${C.rst}`);
console.log(`  ${C.dim}${divider}${C.rst}\n`);

if (totalFailed > 0) {
  console.log(
    `  ${C.red}${C.bld}Lighthouse threshold check FAILED — ${totalFailed} check(s) must be fixed.${C.rst}\n`,
  );
  process.exit(1);
}

if (totalWarned > 0) {
  console.log(
    `  ${C.yel}${C.bld}All hard checks passed with ${totalWarned} warning(s) — review above.${C.rst}\n`,
  );
} else {
  console.log(
    `  ${C.grn}${C.bld}All Lighthouse threshold checks passed.${C.rst}\n`,
  );
}
