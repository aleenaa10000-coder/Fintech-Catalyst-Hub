/**
 * AEO Health Check
 *
 * Scans every page component under artifacts/fintechpresshub/src/pages/ and
 * reports four classes of issue:
 *
 *  1. RAW_HELMET      — file imports { Helmet } from react-helmet-async and uses
 *                       it to inject <script type="application/ld+json"> directly.
 *                       All JSON-LD must go through <PageMeta> props instead.
 *
 *  2. MISSING_META    — non-admin, non-utility page has no <PageMeta usage at all,
 *                       meaning it ships with no structured data or OG tags.
 *
 *  3. RAW_JSONLD      — file contains a raw application/ld+json string outside
 *                       of PageMeta (catches cases where Helmet import was removed
 *                       but a JSON-LD string constant was left dangling).
 *
 *  4. STALE_DATE      — a lastmod date in seoConstants.ts is older than
 *                       STALE_THRESHOLD_DAYS. Stale dates cause crawlers to
 *                       deprioritise pages as un-maintained.
 *
 *  5. MISSING_SSR_FIELD — a critical AEO field is absent from ssrMeta.ts.
 *                         These fields (abstract, publishingPrinciples, speakable)
 *                         are set server-side and invisible to the component
 *                         scanner above, so they need their own dedicated check.
 *
 * Run: pnpm --filter @workspace/scripts run aeo:check
 */

import fs from "fs";
import path from "path";

const PAGES_DIR = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../artifacts/fintechpresshub/src/pages",
);

const SEO_CONSTANTS_PATH = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../artifacts/api-server/src/lib/seoConstants.ts",
);

const SSR_META_PATH = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../artifacts/api-server/src/middlewares/ssrMeta.ts",
);

const STALE_THRESHOLD_DAYS = 180;

/**
 * Admin pages and pure-utility files that intentionally omit <PageMeta>.
 * Any filename whose basename matches one of these prefixes is skipped for
 * the MISSING_META check (but still checked for raw Helmet/JSON-LD).
 */
const SKIP_META_PREFIXES = [
  "admin-",
  "admin",
  "not-found",
  "status",
];

function isSkippedForMeta(relPath: string): boolean {
  const base = path.basename(relPath);
  return SKIP_META_PREFIXES.some((p) => base.startsWith(p));
}

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      collectTsxFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

type Issue = {
  file: string;
  kind: "RAW_HELMET" | "MISSING_META" | "RAW_JSONLD" | "STALE_DATE" | "MISSING_SSR_FIELD";
  detail: string;
};

/**
 * Scan a single file for stale lastmod dates.
 *
 * Rules:
 *  - Reads line-by-line tracking the enclosing `const <NAME>` declaration.
 *  - Skips any block whose name ends with `_CREATED` — those hold immutable
 *    historical publication dates that should never be updated.
 *  - Deduplicates date strings within the file so a single date string that
 *    appears in multiple places only triggers one warning.
 *  - Reports any date older than STALE_THRESHOLD_DAYS with the file and
 *    a hint pointing to the relevant constant name.
 */
/**
 * When provided, only report stale dates found inside blocks whose constant
 * name ends with one of the listed suffixes. Provide `undefined` to report
 * stale dates from all non-`_CREATED` blocks (the seoConstants.ts strategy).
 *
 * Used for ssrMeta.ts where we only want to monitor `STATIC_PAGE_LASTMOD`
 * (which ends in `_LASTMOD`) but not the many inline `datePublished` fallback
 * strings that appear in function bodies (e.g. `?? "2021-01-01"`).
 */
function scanFileForStaleDates(
  filePath: string,
  hint: string,
  seen: Set<string>,
  blockSuffixAllowlist?: string[],
): Issue[] {
  const issues: Issue[] = [];
  if (!fs.existsSync(filePath)) return issues;

  const src = fs.readFileSync(filePath, "utf-8");
  const now = Date.now();
  const thresholdMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  // Detect both `export const NAME` (seoConstants.ts) and
  // `const NAME` (ssrMeta.ts — constants are not exported).
  const blockDeclPattern = /^\s*(?:export\s+)?const\s+(\w+)/;
  const lineDatePattern = /["'](\d{4}-\d{2}-\d{2})["']/g;
  let currentBlock = "";

  for (const line of src.split("\n")) {
    const blockMatch = blockDeclPattern.exec(line);
    if (blockMatch) currentBlock = blockMatch[1]!;

    // Skip immutable historical publication dates.
    if (currentBlock.endsWith("_CREATED")) continue;

    // When an allowlist of block name suffixes is provided (e.g. ["_LASTMOD"]),
    // only report dates from blocks whose name ends with one of those suffixes.
    // This prevents false-positive STALE_DATE warnings for inline `datePublished`
    // fallback strings that appear in function bodies in ssrMeta.ts.
    if (
      blockSuffixAllowlist !== undefined &&
      blockSuffixAllowlist.length > 0 &&
      !blockSuffixAllowlist.some((suffix) => currentBlock.endsWith(suffix))
    ) {
      continue;
    }

    let match: RegExpExecArray | null;
    lineDatePattern.lastIndex = 0;
    while ((match = lineDatePattern.exec(line)) !== null) {
      const dateStr = match[1]!;
      if (seen.has(dateStr)) continue;
      seen.add(dateStr);

      const dateMs = new Date(dateStr).getTime();
      if (isNaN(dateMs)) continue;

      const ageMs = now - dateMs;
      if (ageMs > thresholdMs) {
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        issues.push({
          file: path.relative(PAGES_DIR, filePath),
          kind: "STALE_DATE",
          detail: `Date "${dateStr}" is ${ageDays} days old (>${STALE_THRESHOLD_DAYS} day threshold) in ${currentBlock}. ${hint}`,
        });
      }
    }
  }

  return issues;
}

function checkStaleDates(): Issue[] {
  // Deduplicate date strings across both files — a date like "2026-05-09"
  // that appears in both seoConstants.ts AND ssrMeta.ts should only produce
  // one STALE_DATE warning when it eventually goes stale.
  const seen = new Set<string>();

  return [
    // seoConstants.ts: TOOL_PAGE_LASTMOD, COMPARE_PAGE_LASTMOD, SERVICE_PAGE_LASTMOD_DATE
    ...scanFileForStaleDates(
      SEO_CONSTANTS_PATH,
      "Update the relevant *_LASTMOD constant in seoConstants.ts.",
      seen,
    ),
    // ssrMeta.ts: STATIC_PAGE_LASTMOD (dates for /, /about, /services, etc.)
    // This file is NOT scanned by the standard seoConstants path, so without
    // this check the STATIC_PAGE_LASTMOD dates would silently go stale.
    // Only blocks ending in "_LASTMOD" are checked — inline `datePublished`
    // fallback strings like `?? "2021-01-01"` in function bodies are excluded.
    ...scanFileForStaleDates(
      SSR_META_PATH,
      "Update the STATIC_PAGE_LASTMOD constant in ssrMeta.ts.",
      seen,
      ["_LASTMOD"],
    ),
  ];
}

/**
 * Check that ssrMeta.ts contains critical AEO fields that are injected
 * server-side and are therefore invisible to the component scanner.
 *
 * Checks performed:
 *   - BlogPosting `abstract` field (AI snippet generation)
 *   - BlogPosting `publishingPrinciples` (YMYL E-E-A-T signal)
 *   - WebPage/homepage `speakable` field (voice assistant eligibility)
 *   - `.speakable-summary` CSS selector in SpeakableSpecification
 */
function checkSsrSchemaCompleteness(): Issue[] {
  const issues: Issue[] = [];
  if (!fs.existsSync(SSR_META_PATH)) return issues;

  const src = fs.readFileSync(SSR_META_PATH, "utf-8");
  const rel = path.relative(PAGES_DIR, SSR_META_PATH);

  const checks: Array<{ search: string; fieldDesc: string }> = [
    {
      search: "abstract:",
      fieldDesc: "BlogPosting `abstract` field — required for AI snippet generation. " +
        "Add `abstract: post.blufSummary ?? post.excerpt` to the BlogPosting JSON-LD block.",
    },
    {
      search: "publishingPrinciples:",
      fieldDesc: "BlogPosting `publishingPrinciples` field — required for YMYL E-E-A-T compliance. " +
        "Add `publishingPrinciples: siteUrl + '/editorial-guidelines'` to the BlogPosting block.",
    },
    {
      search: "speakable:",
      fieldDesc: "WebPage `speakable` / SpeakableSpecification — required for voice assistant eligibility. " +
        "Add SpeakableSpecification with cssSelector to the homepage or blog post WebPage blocks.",
    },
    {
      search: ".speakable-summary",
      fieldDesc: "SpeakableSpecification cssSelector `.speakable-summary` — the CSS class used by " +
        "SpeakableSpecification must match what is rendered in page components. " +
        "Ensure at least one page block uses `.speakable-summary` as a cssSelector value.",
    },
    {
      // inLanguage is required on every schema entity for international SEO
      // (Google uses it for multilingual content deduplication) and for AI
      // citation engine language filtering. Every blog post, service page,
      // tool page, and static page entity must declare inLanguage: "en".
      search: 'inLanguage:   "en"',
      fieldDesc: '`inLanguage` field — required on every schema entity for multilingual ' +
        'signal accuracy. Add `inLanguage: "en"` to all JSON-LD blocks in ssrMeta.ts. ' +
        'Use the exact string `inLanguage:   "en"` (with alignment spaces) or adjust ' +
        'the search string in checkSsrSchemaCompleteness() if the formatting changes.',
    },
  ];

  for (const { search, fieldDesc } of checks) {
    if (!src.includes(search)) {
      issues.push({
        file: rel,
        kind: "MISSING_SSR_FIELD",
        detail: `Missing "${search}" in ssrMeta.ts. ${fieldDesc}`,
      });
    }
  }

  return issues;
}

function auditFile(filePath: string): Issue[] {
  const rel = path.relative(PAGES_DIR, filePath);
  const src = fs.readFileSync(filePath, "utf-8");
  const issues: Issue[] = [];

  const importsHelmet = /import\s*\{[^}]*\bHelmet\b[^}]*\}\s*from\s*["']react-helmet-async["']/.test(src);
  const hasJsonLdInHelmet = importsHelmet && /application\/ld\+json/.test(src);
  const hasPageMeta = /<PageMeta[\s/>]/.test(src);
  // dangerouslySetInnerHTML with ld+json — raw inline script tag in JSX
  const hasDangerousJsonLd = /dangerouslySetInnerHTML.*application\/ld\+json|application\/ld\+json.*dangerouslySetInnerHTML/s.test(src);
  // Raw JSON-LD string present but Helmet not imported and not dangerouslySetInnerHTML
  const hasRawJsonLd = !importsHelmet && !hasDangerousJsonLd && /application\/ld\+json/.test(src);

  if (hasJsonLdInHelmet) {
    issues.push({
      file: rel,
      kind: "RAW_HELMET",
      detail:
        "Imports Helmet and injects application/ld+json directly. Migrate to <PageMeta> props.",
    });
  }

  if (hasDangerousJsonLd) {
    issues.push({
      file: rel,
      kind: "RAW_JSONLD",
      detail:
        "Uses dangerouslySetInnerHTML to inject application/ld+json directly. Migrate to <PageMeta> props.",
    });
  }

  if (hasRawJsonLd) {
    issues.push({
      file: rel,
      kind: "RAW_JSONLD",
      detail:
        'Contains "application/ld+json" string — possible leftover raw JSON-LD not routed through PageMeta.',
    });
  }

  if (!hasPageMeta && !isSkippedForMeta(rel)) {
    issues.push({
      file: rel,
      kind: "MISSING_META",
      detail: "No <PageMeta usage found. Page will have no OG tags or structured data.",
    });
  }

  return issues;
}

function main(): void {
  const files = collectTsxFiles(PAGES_DIR);
  const allIssues: Issue[] = [];

  for (const f of files) {
    allIssues.push(...auditFile(f));
  }

  // Check seoConstants.ts for stale lastmod dates
  allIssues.push(...checkStaleDates());

  // Check ssrMeta.ts for critical AEO fields
  allIssues.push(...checkSsrSchemaCompleteness());

  const byKind = {
    RAW_HELMET:       allIssues.filter((i) => i.kind === "RAW_HELMET"),
    RAW_JSONLD:       allIssues.filter((i) => i.kind === "RAW_JSONLD"),
    MISSING_META:     allIssues.filter((i) => i.kind === "MISSING_META"),
    STALE_DATE:       allIssues.filter((i) => i.kind === "STALE_DATE"),
    MISSING_SSR_FIELD: allIssues.filter((i) => i.kind === "MISSING_SSR_FIELD"),
  };

  console.log("\n══════════════════════════════════════════════════");
  console.log("  AEO Health Check — FintechPressHub");
  console.log(`  Scanned ${files.length} page files`);
  console.log("══════════════════════════════════════════════════\n");

  if (allIssues.length === 0) {
    console.log("✅  No AEO issues found. All pages look good.\n");
    return;
  }

  if (byKind.RAW_HELMET.length > 0) {
    console.log(`🔴  RAW_HELMET (${byKind.RAW_HELMET.length} issue${byKind.RAW_HELMET.length > 1 ? "s" : ""})`);
    console.log("    JSON-LD must never be injected via raw <Helmet>.");
    console.log("    Fix: move all structured data into <PageMeta> props.\n");
    for (const i of byKind.RAW_HELMET) {
      console.log(`    • ${i.file}`);
      console.log(`      ${i.detail}\n`);
    }
  }

  if (byKind.RAW_JSONLD.length > 0) {
    console.log(`🟠  RAW_JSONLD (${byKind.RAW_JSONLD.length} issue${byKind.RAW_JSONLD.length > 1 ? "s" : ""})`);
    console.log("    Possible dangling JSON-LD string not routed through PageMeta.\n");
    for (const i of byKind.RAW_JSONLD) {
      console.log(`    • ${i.file}`);
      console.log(`      ${i.detail}\n`);
    }
  }

  if (byKind.MISSING_META.length > 0) {
    console.log(`🟡  MISSING_META (${byKind.MISSING_META.length} issue${byKind.MISSING_META.length > 1 ? "s" : ""})`);
    console.log("    These pages ship with no OG tags or structured data.\n");
    for (const i of byKind.MISSING_META) {
      console.log(`    • ${i.file}`);
      console.log(`      ${i.detail}\n`);
    }
  }

  if (byKind.STALE_DATE.length > 0) {
    console.log(`🔵  STALE_DATE (${byKind.STALE_DATE.length} issue${byKind.STALE_DATE.length > 1 ? "s" : ""})`);
    console.log(`    These lastmod dates in seoConstants.ts are >${STALE_THRESHOLD_DAYS} days old.\n`);
    for (const i of byKind.STALE_DATE) {
      console.log(`    • ${i.detail}\n`);
    }
  }

  if (byKind.MISSING_SSR_FIELD.length > 0) {
    console.log(`🟣  MISSING_SSR_FIELD (${byKind.MISSING_SSR_FIELD.length} issue${byKind.MISSING_SSR_FIELD.length > 1 ? "s" : ""})`);
    console.log("    Critical AEO fields are absent from ssrMeta.ts.\n");
    for (const i of byKind.MISSING_SSR_FIELD) {
      console.log(`    • ${i.file}`);
      console.log(`      ${i.detail}\n`);
    }
  }

  const critical = byKind.RAW_HELMET.length + byKind.RAW_JSONLD.length;
  const warnings  = byKind.MISSING_META.length + byKind.MISSING_SSR_FIELD.length;
  console.log("══════════════════════════════════════════════════");
  console.log(`  Total: ${allIssues.length} issue(s)  |  ${critical} critical  |  ${warnings} warnings  |  ${byKind.STALE_DATE.length} stale dates`);
  console.log("══════════════════════════════════════════════════\n");

  if (critical > 0) {
    process.exit(1);
  }
}

main();
