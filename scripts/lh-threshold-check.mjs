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
import { resolve, join } from "path";

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
//   • LCP / CLS / TBT limits are set 20 % wider than Google's "Good" band to
//     absorb normal CI timing variance while still catching real regressions.
//
const THRESHOLDS = [
  {
    key: "categories:performance",
    label: "Performance score",
    unit: "score",
    failIf: "lt",
    fail: 0.45,  // hard fail only for catastrophic regressions
    warn: 0.70,  // warn when drifting below 70 (CI-safe threshold)
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
    fail: 4000,   // Google "Poor" threshold (Good ≤ 2 500 ms)
    warn: 3000,   // Google "Needs Improvement" threshold
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

  for (const t of THRESHOLDS) {
    const value = getValue(lhr, t.key);
    if (value == null) {
      lines.push({ type: "info", msg: `${t.label}: (not available)` });
      continue;
    }

    const formatted = t.format ? t.format(value) : String(value);
    const breachesFail =
      t.failIf === "gt" ? value > t.fail : value < t.fail;
    const breachesWarn =
      t.failIf === "gt" ? value > t.warn : value < t.warn;

    const threshold =
      t.failIf === "gt"
        ? `fail >${t.format ? t.format(t.fail) : t.fail}, warn >${t.format ? t.format(t.warn) : t.warn}`
        : `fail <${t.format ? t.format(t.fail) : t.fail}, warn <${t.format ? t.format(t.warn) : t.warn}`;

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
  console.log(
    `  ${C.bld}${displayUrl || "/"}${C.rst}  [${pageStatus}]`,
  );
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
