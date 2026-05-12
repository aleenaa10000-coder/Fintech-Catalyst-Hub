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

const REQUIRED_FIELDS: Record<string, string[]> = {
  BlogPosting:           ["headline", "datePublished", "author", "url"],
  FAQPage:               ["mainEntity"],
  HowTo:                 ["name", "step"],
  BreadcrumbList:        ["itemListElement"],
  SoftwareApplication:   ["name", "applicationCategory", "operatingSystem"],
  DefinedTerm:           ["name", "description"],
  LocalBusiness:         ["name", "address"],
  ProfilePage:           ["mainEntity"],
  WebPage:               ["url"],
  ItemList:              ["itemListElement"],
  Organization:          ["name", "url", "logo"],
  FinancialService:      ["name", "url"],
  ProfessionalService:   ["name", "url"],
  CollectionPage:        ["name", "url"],
  NewsMediaOrganization: ["name", "url"],
};

/**
 * Use brace-counting to extract the raw text of every JSON.stringify({...})
 * call in the source, skipping string/template-literal contents so nested
 * braces inside strings don't throw off the counter.
 */
function extractJsonStringifyBlocks(source: string): string[] {
  const blocks: string[] = [];
  let pos = 0;

  while (pos < source.length) {
    const start = source.indexOf("JSON.stringify({", pos);
    if (start === -1) break;

    let i = start + "JSON.stringify(".length;
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

  const required = REQUIRED_FIELDS[type] ?? [];
  const missing = required.filter((f) => !hasField(raw, f));
  return { schemaType: type, valid: missing.length === 0, missing };
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
  const results = rawBlocks
    .map(validateBlock)
    .filter((r): r is ValidationResult => r !== null);

  if (results.length === 0) {
    console.warn("WARNING: No top-level (@context) JSON-LD blocks found.");
    process.exit(0);
  }

  // Deduplicate — prefer failing result per type so problems are visible
  const seen = new Map<string, ValidationResult>();
  for (const r of results) {
    if (!seen.has(r.schemaType) || !r.valid) seen.set(r.schemaType, r);
  }

  console.log(`\nSchema validation — ${results.length} top-level JSON-LD blocks in ssrMeta.ts\n`);
  console.log("─".repeat(lineWidth));

  for (const r of seen.values()) {
    if (r.missing.length > 0) {
      errors++;
      console.error(`FAIL  [${r.schemaType}]  missing: ${r.missing.join(", ")}`);
    } else {
      console.log(`OK    [${r.schemaType}]`);
    }
  }

  console.log("─".repeat(lineWidth));
  console.log(`\nResult: ${seen.size} schema types checked, ${errors} error(s)\n`);

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
