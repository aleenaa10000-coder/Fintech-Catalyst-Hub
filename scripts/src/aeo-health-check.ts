/**
 * AEO Health Check
 *
 * Scans every page component under artifacts/fintechpresshub/src/pages/ and
 * reports three classes of issue:
 *
 *  1. RAW_HELMET   — file imports { Helmet } from react-helmet-async and uses
 *                    it to inject <script type="application/ld+json"> directly.
 *                    All JSON-LD must go through <PageMeta> props instead.
 *
 *  2. MISSING_META — non-admin, non-utility page has no <PageMeta usage at all,
 *                    meaning it ships with no structured data or OG tags.
 *
 *  3. RAW_JSONLD   — file contains a raw application/ld+json string outside
 *                    of PageMeta (catches cases where Helmet import was removed
 *                    but a JSON-LD string constant was left dangling).
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
  kind: "RAW_HELMET" | "MISSING_META" | "RAW_JSONLD" | "STALE_DATE";
  detail: string;
};

function checkStaleDates(): Issue[] {
  const issues: Issue[] = [];
  if (!fs.existsSync(SEO_CONSTANTS_PATH)) return issues;

  const src = fs.readFileSync(SEO_CONSTANTS_PATH, "utf-8");
  const now = Date.now();
  const thresholdMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  // Match date strings in STATIC_PAGE_LASTMOD / TOOL_PAGE_LASTMOD / COMPARE_PAGE_LASTMOD
  // and SERVICE_PAGE_LASTMOD_DATE patterns: "YYYY-MM-DD"
  // Scan line-by-line so we can track the enclosing constant name and skip
  // *_CREATED constants (which hold immutable historical publication dates).
  const blockDeclPattern = /^\s*export\s+const\s+(\w+)/;
  const lineDatePattern = /["'](\d{4}-\d{2}-\d{2})["']/g;
  let currentBlock = "";
  const seen = new Set<string>();

  for (const line of src.split("\n")) {
    const blockMatch = blockDeclPattern.exec(line);
    if (blockMatch) currentBlock = blockMatch[1]!;

    // Skip dates inside *_CREATED constants — those are immutable publication dates.
    if (currentBlock.endsWith("_CREATED") || currentBlock.includes("CREATED")) continue;

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
          file: path.relative(PAGES_DIR, SEO_CONSTANTS_PATH),
          kind: "STALE_DATE",
          detail: `Date "${dateStr}" is ${ageDays} days old (>${STALE_THRESHOLD_DAYS} day threshold). Update STATIC_PAGE_LASTMOD or the relevant *_LASTMOD constant in seoConstants.ts.`,
        });
      }
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

  const byKind = {
    RAW_HELMET: allIssues.filter((i) => i.kind === "RAW_HELMET"),
    RAW_JSONLD: allIssues.filter((i) => i.kind === "RAW_JSONLD"),
    MISSING_META: allIssues.filter((i) => i.kind === "MISSING_META"),
    STALE_DATE: allIssues.filter((i) => i.kind === "STALE_DATE"),
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

  const critical = byKind.RAW_HELMET.length + byKind.RAW_JSONLD.length;
  console.log("══════════════════════════════════════════════════");
  console.log(`  Total: ${allIssues.length} issue(s)  |  ${critical} critical  |  ${byKind.MISSING_META.length} warnings  |  ${byKind.STALE_DATE.length} stale dates`);
  console.log("══════════════════════════════════════════════════\n");

  if (critical > 0) {
    process.exit(1);
  }
}

main();
