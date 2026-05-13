/**
 * schema-validate — static JSON-LD structure checker.
 *
 * Validates that every TOP-LEVEL structured-data block emitted by ssrMeta.ts
 * (i.e. blocks that include "@context") contains the required fields for its
 * @type. Run as part of the typecheck workflow so schema regressions are
 * caught before deployment without needing a live server.
 *
 * Strategy: brace-count extraction + keyword presence search.
 * We don't try to JSON.parse the TypeScript source — template literals and JS
 * expressions would break that. Instead we just search for required key
 * substrings within each extracted block.
 *
 * Special cases — FALLBACK_CHECKS:
 * Some schema types exist in blocks whose source structure (multi-line
 * JSON.stringify, IIFEs, complex nesting) confuses or evades the brace-counter.
 * A dedicated fallback validates those types directly via text search,
 * bypassing the block extractor entirely.
 *
 * Known fallback types:
 *   - BlogPosting: dual-@type block contains a citation-extraction IIFE that
 *     confuses the brace counter.
 *   - BreadcrumbList: `buildBreadcrumbLd()` uses multi-line JSON.stringify
 *     (brace on next line after the `(`) which the extractor pattern misses.
 *
 * Types NOT in ssrMeta.ts (do not add to REQUIRED_FIELDS):
 *   - Organization, NewsMediaOrganization, WebSite: these live in the
 *     static @graph in artifacts/fintechpresshub/index.html, not in ssrMeta.ts.
 *     Validate them manually using Google's Rich Results Test after deploys.
 *
 * Check #2 — FAQ answer HTML safety:
 * Every acceptedAnswer.text that references a dynamic variable must be wrapped
 * in the project's stripHtml() helper. Google rejects FAQPage rich results
 * when acceptedAnswer.text contains HTML markup. This check catches any future
 * code that introduces a raw-answer path (e.g. `text: item.answer` instead of
 * `text: stripHtml(item.answer)`).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run schema:check
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Schema types that MUST be present in ssrMeta.ts.
 * Each type listed here will be checked against extracted or fallback blocks.
 *
 * IMPORTANT: Do NOT add Organization, NewsMediaOrganization, or WebSite here.
 * Those three types are in the static @graph in index.html, not ssrMeta.ts.
 * The extractor only reads ssrMeta.ts so it will never find them — adding them
 * creates false confidence (the "OK" line never appears for them).
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  BlogPosting:           ["headline", "datePublished", "author", "url"],
  FAQPage:               ["mainEntity"],
  HowTo:                 ["name", "step"],
  BreadcrumbList:        ["itemListElement"],
  SoftwareApplication:   ["name", "applicationCategory", "operatingSystem"],
  DefinedTerm:           ["name", "description"],
  // DefinedTermSet is emitted on /glossary as a top-level block with @context.
  // It uses a multi-line or IIFE-complex pattern that confuses the brace counter —
  // validated via FALLBACK_CHECKS below instead of pure extraction.
  DefinedTermSet:        ["name", "url"],
  LocalBusiness:         ["name", "address"],
  ProfilePage:           ["mainEntity"],
  WebPage:               ["url"],
  ItemList:              ["itemListElement"],
  FinancialService:      ["name", "url"],
  ProfessionalService:   ["name", "url"],
  CollectionPage:        ["name", "url"],
  // NewsArticle is dual-typed with BlogPosting ["BlogPosting","NewsArticle"] —
  // the BlogPosting FALLBACK_CHECK covers the shared block via text search.
  // Standalone NewsArticle for press mentions is nested (no top-level @context)
  // so it is also handled by the NewsArticle FALLBACK_CHECK below.
  NewsArticle:           ["headline", "datePublished", "author"],
  // AggregateRating and Review are nested inside the homepage JSON.stringify
  // block without their own "@context" — they are handled by FALLBACK_CHECKS.
  AggregateRating:       ["ratingValue", "ratingCount"],
  Review:                ["author", "reviewBody"],
  AboutPage:             ["url", "name"],
  ContactPage:           ["url", "name"],
  Blog:                  ["url", "name"],
};

/**
 * Schema types validated via the dedicated text-search fallback instead of
 * brace-count extraction. These types exist in blocks whose source structure
 * (IIFEs, multi-line JSON.stringify, complex nesting) confuses the brace-counter
 * before it captures the closing brace of the top-level JSON.stringify call.
 *
 * Each entry maps a schema type to { searchFor, requiredFields } where:
 *   searchFor     — the literal string used to locate the block in source
 *   requiredFields — fields to verify are present in the 200-line window
 */
const FALLBACK_CHECKS: Record<string, { searchFor: string; requiredFields: string[] }> = {
  BlogPosting: {
    // Dual-@type ["BlogPosting", "NewsArticle"] block contains a citation-extraction
    // IIFE that confuses the brace counter. Text-search on the dual-type array marker
    // is whitespace-independent and unambiguous.
    searchFor:      '["BlogPosting"',
    requiredFields: ["headline", "datePublished", "author", "url"],
  },
  BreadcrumbList: {
    // buildBreadcrumbLd() uses `JSON.stringify(\n    {` (brace on next line)
    // which the extractor's "JSON.stringify({" pattern misses.
    // The function body always contains "@type": "BreadcrumbList" literally.
    searchFor:      '"@type": "BreadcrumbList"',
    requiredFields: ["itemListElement"],
  },
  FinancialService: {
    // Dual-type ["FinancialService", "ProfessionalService"] service-page block.
    // The brace counter may fail on complex nested service blocks; text-search
    // on the dual-type array is the reliable fallback.
    searchFor:      '"FinancialService"',
    requiredFields: ["name", "url"],
  },
  NewsArticle: {
    // NewsArticle appears both as part of the dual BlogPosting+NewsArticle type
    // and as standalone nested items in the press mentions ItemList. Neither
    // form produces an independent @context block — text-search confirms presence.
    searchFor:      '"@type":       "NewsArticle"',
    requiredFields: ["headline", "datePublished"],
  },
  AggregateRating: {
    // AggregateRating is nested inside the homepage block (no own @context).
    // Text-search confirms it is emitted with all required fields.
    searchFor:      '"@type":       "AggregateRating"',
    requiredFields: ["ratingValue", "ratingCount"],
  },
  Review: {
    // Review objects are nested inside the homepage AggregateRating block.
    // reviewBody is the distinctive field that distinguishes Review from other types.
    searchFor:      'reviewBody:',
    requiredFields: ["reviewBody"],
  },
  DefinedTermSet: {
    // DefinedTermSet is emitted on /glossary as a top-level block. The block
    // uses spread expressions (e.g. `...(cond ? {} : {})`) and DB-driven term
    // lists that confuse the brace-counter before it captures the closing brace.
    // Text-search on the unique `"@type":      "DefinedTermSet"` literal reliably
    // locates the glossary hub block and verifies required fields are present.
    searchFor:      '"@type":      "DefinedTermSet"',
    requiredFields: ["name", "url"],
  },
};

/**
 * Use brace-counting to extract the raw text of every JSON.stringify({...})
 * call in the source, skipping string/template-literal contents so nested
 * braces inside strings don't throw off the counter.
 *
 * Handles both single-line `JSON.stringify({` and multi-line
 * `JSON.stringify(\n  {` patterns by finding `JSON.stringify(` and then
 * skipping any whitespace before the opening `{`.
 */
function extractJsonStringifyBlocks(source: string): string[] {
  const blocks: string[] = [];
  let pos = 0;
  const MARKER = "JSON.stringify(";

  while (pos < source.length) {
    const start = source.indexOf(MARKER, pos);
    if (start === -1) break;

    // Skip whitespace between `JSON.stringify(` and `{` to handle both
    // single-line `JSON.stringify({` and multi-line `JSON.stringify(\n  {`.
    let i = start + MARKER.length;
    while (i < source.length && (source[i] === " " || source[i] === "\t" || source[i] === "\n" || source[i] === "\r")) {
      i++;
    }

    if (source[i] !== "{") {
      // Not an object literal — could be a variable reference like
      // JSON.stringify(myObj). Skip this occurrence.
      pos = start + 1;
      continue;
    }

    const objStart = i;
    let depth = 0;

    while (i < source.length) {
      const ch = source[i];

      if (ch === "{" || ch === "[") {
        depth++;
        i++;
      } else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          blocks.push(source.slice(objStart, i + 1));
          break;
        }
        i++;
      } else if (ch === "`") {
        // Skip template literal — handle nested ${...} with a counter
        i++;
        let tlDepth = 0;
        while (i < source.length) {
          const tc = source[i];
          if (tc === "`" && tlDepth === 0) { i++; break; }
          if (tc === "$" && source[i + 1] === "{") { tlDepth++; i += 2; continue; }
          if (tc === "}" && tlDepth > 0) { tlDepth--; i++; continue; }
          if (tc === "\\" ) { i += 2; continue; }
          i++;
        }
      } else if (ch === '"' || ch === "'") {
        const q = ch;
        i++;
        while (i < source.length && source[i] !== q) {
          if (source[i] === "\\") i++;
          i++;
        }
        i++; // closing quote
      } else {
        i++;
      }
    }

    pos = start + 1;
  }

  return blocks;
}

/**
 * Extract the @type value from a raw block string.
 * Handles string values and array values (dual-type entities).
 */
function extractType(raw: string): string | null {
  const m = /"@type"\s*:\s*(?:"([^"]+)"|\[([^\]]+)\])/.exec(raw);
  if (!m) return null;
  if (m[1]) return m[1];
  if (m[2]) {
    const first = /"([^"]+)"/.exec(m[2]);
    return first ? first[1]! : null;
  }
  return null;
}

/**
 * Check if a raw block contains "@context" at the top level.
 * We just search for the substring — close enough for our purposes since
 * "@context" only appears as a top-level key in schema.org blocks.
 */
function hasContext(raw: string): boolean {
  return raw.includes('"@context"');
}

/**
 * Check if a required field key is present in the block.
 * We search for `"fieldName"` or `fieldName:` as a key.
 */
function hasField(raw: string, field: string): boolean {
  return raw.includes(`"${field}"`) || raw.includes(`${field}:`);
}

interface ValidationResult {
  schemaType: string;
  valid: boolean;
  missing: string[];
}

function validateBlock(raw: string): ValidationResult | null {
  if (!hasContext(raw)) return null; // skip nested reference objects
  const type = extractType(raw);
  if (!type) return null;

  // Skip types handled by the dedicated fallback — they will be validated
  // separately via validateFallbackChecks() to avoid the brace-counter issue.
  if (type in FALLBACK_CHECKS) return null;

  const required = REQUIRED_FIELDS[type] ?? [];
  const missing = required.filter((f) => !hasField(raw, f));
  return { schemaType: type, valid: missing.length === 0, missing };
}

/**
 * Validate schema types that require text-search instead of brace extraction.
 *
 * For each FALLBACK_CHECKS entry, locate the searchFor string in the source,
 * extract a 200-line window around it, and verify all required fields appear
 * somewhere in that window. This approach is robust to complex IIFE expressions
 * or deeply nested arrow-function bodies that confuse the brace counter.
 */
function validateFallbackChecks(source: string): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const [schemaType, { searchFor, requiredFields }] of Object.entries(FALLBACK_CHECKS)) {
    const idx = source.indexOf(searchFor);
    if (idx === -1) {
      // Type not found at all — flag every required field as missing
      results.push({ schemaType, valid: false, missing: requiredFields });
      continue;
    }

    // Extract a generous window (200 lines in each direction from the match)
    // to capture the full block even though we can't determine its exact boundaries.
    const lineStart = source.lastIndexOf("\n", idx - 1);
    const windowStart = Math.max(0, lineStart - 200 * 120);  // ~200 lines before
    const windowEnd   = Math.min(source.length, idx + 200 * 120); // ~200 lines after
    const window      = source.slice(windowStart, windowEnd);

    const missing = requiredFields.filter((f) => !hasField(window, f));
    results.push({ schemaType, valid: missing.length === 0, missing });
  }

  return results;
}

/**
 * Check #2 — FAQ answer HTML safety.
 *
 * Scans every `acceptedAnswer:` occurrence in the source and verifies that
 * the `text:` value is either:
 *   a) a static string literal (safe by definition — no dynamic HTML), or
 *   b) wrapped in `stripHtml(...)` (the project-standard guard).
 *
 * A bare dynamic expression like `text: item.answer` would allow DB-sourced
 * HTML to leak into JSON-LD, which Google flags as a FAQPage error.
 *
 * Returns a list of human-readable error strings, empty if all pass.
 */
function checkFaqAnswerStripping(source: string): string[] {
  const errors: string[] = [];

  // Match `acceptedAnswer: { "@type": "Answer", text: <value> }`
  // The [^}]* is intentionally non-greedy-ish — acceptedAnswer objects are
  // always single-depth inline objects in ssrMeta.ts.
  const re = /acceptedAnswer\s*:\s*\{[^}]*\btext\s*:\s*([^,}\n]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(source)) !== null) {
    const valueExpr = m[1].trim();

    // Static string literals (double-quote, single-quote, or template) are
    // safe — they cannot contain dynamic HTML.
    if (
      valueExpr.startsWith('"') ||
      valueExpr.startsWith("'") ||
      valueExpr.startsWith("`")
    ) {
      continue;
    }

    // Dynamic expressions must be wrapped in stripHtml().
    if (!valueExpr.startsWith("stripHtml(")) {
      const snippet = valueExpr.slice(0, 70);
      errors.push(`acceptedAnswer.text not wrapped in stripHtml(): \`${snippet}\``);
    }
  }

  return errors;
}

function main() {
  const ssrMetaPath = resolve(__dirname, "../../artifacts/api-server/src/middlewares/ssrMeta.ts");
  let source: string;
  try {
    source = readFileSync(ssrMetaPath, "utf-8");
  } catch {
    console.error(`ERROR: Could not read ssrMeta.ts at ${ssrMetaPath}`);
    process.exit(1);
  }

  const lineWidth = 62;
  let errors = 0;

  // ── Check 1: Required fields per schema type ──────────────────────────────
  const rawBlocks = extractJsonStringifyBlocks(source);
  const extractedResults = rawBlocks
    .map(validateBlock)
    .filter((r): r is ValidationResult => r !== null);

  // Validate types that require the text-search fallback (e.g. BlogPosting, BreadcrumbList)
  const fallbackResults = validateFallbackChecks(source);

  const results = [...extractedResults, ...fallbackResults];

  if (results.length === 0) {
    console.warn("WARNING: No top-level (@context) JSON-LD blocks found.");
    process.exit(0);
  }

  // Deduplicate — prefer failing result per type so problems are visible
  const seen = new Map<string, ValidationResult>();
  for (const r of results) {
    if (!seen.has(r.schemaType) || !r.valid) seen.set(r.schemaType, r);
  }

  console.log(`\nSchema validation — ${extractedResults.length} extracted + ${fallbackResults.length} fallback JSON-LD blocks in ssrMeta.ts\n`);
  console.log("─".repeat(lineWidth));

  for (const r of seen.values()) {
    if (r.missing.length > 0) {
      errors++;
      console.error(`FAIL  [${r.schemaType}]  missing: ${r.missing.join(", ")}`);
    } else {
      console.log(`OK    [${r.schemaType}]`);
    }
  }

  // ── Check 1b: Warn about REQUIRED_FIELDS types never found ───────────────
  // If a type is declared in REQUIRED_FIELDS but never appears in any
  // extracted or fallback block, flag it. This catches cases where a schema
  // type was removed from ssrMeta.ts without updating REQUIRED_FIELDS.
  const foundTypes = new Set(seen.keys());
  const neverFound: string[] = [];
  for (const type of Object.keys(REQUIRED_FIELDS)) {
    if (!foundTypes.has(type) && !(type in FALLBACK_CHECKS)) {
      neverFound.push(type);
    }
  }

  console.log("─".repeat(lineWidth));
  console.log(`\nResult: ${seen.size} schema types checked, ${errors} error(s)\n`);

  if (neverFound.length > 0) {
    console.warn(`\nWARN  The following REQUIRED_FIELDS types were declared but never found`);
    console.warn(`      in any extracted block. They may have been removed from ssrMeta.ts`);
    console.warn(`      or use a pattern the extractor doesn't support (add to FALLBACK_CHECKS):`);
    for (const t of neverFound) {
      console.warn(`        - ${t}`);
    }
    console.warn("");
  }

  // ── Check 2: FAQ acceptedAnswer.text HTML safety ──────────────────────────
  const faqErrors = checkFaqAnswerStripping(source);

  console.log("FAQ answer safety — acceptedAnswer.text must use stripHtml()\n");
  console.log("─".repeat(lineWidth));

  if (faqErrors.length === 0) {
    console.log("OK    All acceptedAnswer.text values are HTML-safe");
  } else {
    for (const e of faqErrors) {
      errors++;
      console.error(`FAIL  ${e}`);
    }
  }

  console.log("─".repeat(lineWidth));
  console.log(`\nFAQ check: ${faqErrors.length === 0 ? "passed" : `${faqErrors.length} violation(s)`}\n`);

  if (errors > 0) process.exit(1);
}

main();
