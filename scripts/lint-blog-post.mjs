#!/usr/bin/env node
/**
 * scripts/lint-blog-post.mjs
 *
 * Structured content linter for blog posts.
 * Validates every post for SEO-critical field hygiene across
 * On-Page, AEO, GEO, Technical, and White-Hat dimensions:
 *
 *   ①  coverImage       — non-empty, valid http/https URL
 *   ②  excerpt          — present, ≤ 160 characters (meta-description budget)
 *   ③  slug             — lowercase alphanumeric + hyphens; no leading/trailing/consecutive hyphens
 *   ④  title            — 50–70 chars optimal for SERP display
 *   ⑤  blufSummary      — present and ≥ 50 chars (AEO/GEO answer snippet anchor)
 *   ⑥  faqItems         — at least 3 Q&A pairs for FAQPage schema rich result
 *   ⑦  aboutEntities    — at least 1 entity for Knowledge Graph `about` linking
 *   ⑧  tags             — at least 3 tags for keyword breadth signal
 *   ⑨  wordCount        — stored word count ≥ 1 000 words (GEO authority threshold)
 *   ⑩  readingMinutes   — positive integer, consistent with wordCount
 *   ⑪  category         — one of the eight known fintech category slugs
 *   ⑫  seoTitle         — when set, 50–70 chars (same rule as title)
 *   ⑬  seoDescription   — when set, 150–160 chars (SERP truncation budget)
 *
 * Targets the Express API server (default: http://localhost:8080).
 *
 * Exit 0 → all hard checks passed (warnings allowed).
 * Exit 1 → at least one hard check failed.
 *
 * Usage:
 *   node scripts/lint-blog-post.mjs [BASE_URL] [--slug <slug>] [--fail-fast]
 *
 * BASE_URL defaults to http://localhost:8080.
 *
 * Flags:
 *   --slug <slug>   Lint only the post with this slug (faster for CI pre-publish).
 *   --fail-fast     Stop processing after the first failing post.
 */

import { get } from "node:http";

// ── CLI arguments ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let BASE = "http://localhost:8080";
let filterSlug = null;
let failFast = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--slug" && args[i + 1]) {
    filterSlug = args[++i];
  } else if (args[i] === "--fail-fast") {
    failFast = true;
  } else if (!args[i].startsWith("--")) {
    BASE = args[i].replace(/\/$/, "");
  }
}

// ── Terminal colours ───────────────────────────────────────────────────────────
const C = {
  grn: "\x1b[32m", red: "\x1b[31m", yel: "\x1b[33m",
  cyn: "\x1b[36m", dim: "\x1b[2m",  bld: "\x1b[1m",  rst: "\x1b[0m",
};

let passed = 0;
let failed = 0;
let warned = 0;
let postsFailed = 0;

function ok(msg)   { console.log(`    ${C.grn}✔${C.rst}  ${msg}`); passed++; }
function fail(msg) { console.log(`    ${C.red}✘${C.rst}  ${msg}`); failed++; }
function warn(msg) { console.log(`    ${C.yel}⚠${C.rst}  ${msg}`); warned++; }
function head(msg) { console.log(`\n${C.bld}${C.cyn}──  ${msg}  ${C.rst}`); }
function sub(msg)  { console.log(`\n  ${C.bld}${msg}${C.rst}`); }

// ── Known category slugs (single source of truth: seoConstants.ts) ────────────
const KNOWN_CATEGORIES = new Set([
  "payments",
  "embedded-finance",
  "open-banking",
  "neobanking",
  "lending",
  "regtech",
  "wealthtech",
  "fintech-seo",
]);

// ── HTTP helper ────────────────────────────────────────────────────────────────
function fetchJson(url, { timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        } catch (e) {
          reject(new Error(`JSON parse error from ${url}: ${e.message}`));
        }
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timed out: ${url}`)); });
    req.on("error", reject);
  });
}

// ── Validation rules ───────────────────────────────────────────────────────────

/** Rule 1 — coverImage must be a valid http/https URL. */
function lintCoverImage(post) {
  const v = post.coverImage;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("coverImage      — missing or empty");
    return false;
  }
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      fail(`coverImage      — invalid protocol "${u.protocol}" (must be http or https): ${v}`);
      return false;
    }
    ok(`coverImage      — valid URL`);
    return true;
  } catch {
    fail(`coverImage      — not a valid URL: "${v}"`);
    return false;
  }
}

/** Rule 2 — excerpt must be present and ≤ 160 characters. */
function lintExcerpt(post) {
  const v = post.excerpt;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("excerpt         — missing or empty");
    return false;
  }
  const len = v.length;
  if (len > 160) {
    fail(`excerpt         — ${len} chars (limit: 160). Trim ${len - 160} char(s): "${v.slice(0, 40)}…"`);
    return false;
  }
  if (len > 155) {
    warn(`excerpt         — ${len} chars (close to 160-char limit; consider trimming)`);
    return true;
  }
  ok(`excerpt         — ${len} chars (within 160-char budget)`);
  return true;
}

/** Rule 3 — slug must be lowercase alphanumeric with hyphens; no leading/trailing/consecutive hyphens. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function lintSlug(post) {
  const v = post.slug;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("slug            — missing or empty");
    return false;
  }
  if (v !== v.toLowerCase()) {
    fail(`slug            — contains uppercase letters: "${v}"`);
    return false;
  }
  if (!SLUG_RE.test(v)) {
    if (/\s/.test(v))              fail(`slug            — contains whitespace: "${v}"`);
    else if (/^-|-$/.test(v))      fail(`slug            — leading or trailing hyphen: "${v}"`);
    else if (/--/.test(v))         fail(`slug            — consecutive hyphens: "${v}"`);
    else if (/[^a-z0-9-]/.test(v)) fail(`slug            — invalid characters (only a-z, 0-9, hyphen allowed): "${v}"`);
    else                           fail(`slug            — invalid format: "${v}"`);
    return false;
  }
  ok(`slug            — valid format`);
  return true;
}

/**
 * Rule 4 — title should be 50–70 chars for SERP display.
 * Hard fail if > 70 (truncation likely). Warn if < 50 (missed keyword space).
 */
function lintTitle(post) {
  const v = post.title;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("title           — missing or empty");
    return false;
  }
  const len = v.length;
  if (len > 70) {
    fail(`title           — ${len} chars (limit: 70 for clean SERP display). Trim ${len - 70} char(s).`);
    return false;
  }
  if (len < 50) {
    warn(`title           — ${len} chars (below 50; add primary keyword or specificity for SERP impact)`);
    return true;
  }
  ok(`title           — ${len} chars (within 50–70-char SERP window)`);
  return true;
}

/**
 * Rule 5 — blufSummary must be present and ≥ 50 chars.
 * Critical for AEO/GEO: this is the field that populates the speakable
 * CSS selector and the BlogPosting `abstract` field — AI citation engines
 * read it to generate answer snippets. Missing = hard fail.
 */
function lintBlufSummary(post) {
  const v = post.blufSummary;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("blufSummary     — missing (required for AEO/GEO speakable + BlogPosting abstract)");
    return false;
  }
  const len = v.trim().length;
  if (len < 50) {
    fail(`blufSummary     — ${len} chars (too short; write at least 50 chars to anchor answer snippets)`);
    return false;
  }
  if (len > 500) {
    warn(`blufSummary     — ${len} chars (above 500; BlogPosting abstract is truncated at 500)`);
    return true;
  }
  ok(`blufSummary     — ${len} chars (present and within optimal 50–500-char range)`);
  return true;
}

/**
 * Rule 6 — faqItems must be present with at least 3 Q&A pairs.
 * Google requires ≥ 2 Q&As for FAQPage rich result eligibility; 3 is
 * the recommended minimum for coverage. Missing = hard fail.
 */
function lintFaqItems(post) {
  const v = post.faqItems;
  if (!v || !Array.isArray(v) || v.length === 0) {
    fail("faqItems        — missing or empty (FAQPage schema requires ≥ 3 Q&A pairs)");
    return false;
  }
  if (v.length < 3) {
    fail(`faqItems        — ${v.length} item(s) (FAQPage rich result needs ≥ 3 Q&A pairs; add ${3 - v.length} more)`);
    return false;
  }
  const malformed = v.filter(
    (item) => !item || typeof item.question !== "string" || item.question.trim() === "" ||
              typeof item.answer !== "string" || item.answer.trim() === "",
  );
  if (malformed.length > 0) {
    fail(`faqItems        — ${malformed.length} item(s) missing question or answer text`);
    return false;
  }
  ok(`faqItems        — ${v.length} Q&A pair(s) (FAQPage schema eligible)`);
  return true;
}

/**
 * Rule 7 — aboutEntities must be present with at least 1 entry.
 * Maps to BlogPosting `about` in JSON-LD. Missing = Knowledge Graph
 * entity linking is lost. Hard fail.
 */
function lintAboutEntities(post) {
  const v = post.aboutEntities;
  if (!v || !Array.isArray(v) || v.length === 0) {
    fail("aboutEntities   — missing or empty (required for BlogPosting `about` Knowledge Graph link)");
    return false;
  }
  const populated = v.filter((e) => typeof e === "string" && e.trim() !== "");
  if (populated.length === 0) {
    fail("aboutEntities   — all entries are blank strings");
    return false;
  }
  ok(`aboutEntities   — ${populated.length} entit${populated.length === 1 ? "y" : "ies"}: ${populated.slice(0, 3).map((e) => `"${e}"`).join(", ")}${populated.length > 3 ? "…" : ""}`);
  return true;
}

/**
 * Rule 8 — tags: at least 3 for keyword breadth signal.
 * BlogPosting `keywords` aggregates these; fewer than 3 leaves topical
 * coverage sparse. Warn (not hard fail) to avoid blocking legitimate short-form posts.
 */
function lintTags(post) {
  const v = post.tags;
  if (!v || !Array.isArray(v) || v.length === 0) {
    warn("tags            — missing or empty (add ≥ 3 tags to populate BlogPosting `keywords`)");
    return true;
  }
  if (v.length < 3) {
    warn(`tags            — ${v.length} tag(s) (add ${3 - v.length} more for broader keyword signal)`);
    return true;
  }
  ok(`tags            — ${v.length} tag(s): ${v.slice(0, 4).map((t) => `"${t}"`).join(", ")}${v.length > 4 ? "…" : ""}`);
  return true;
}

/**
 * Rule 9 — wordCount must be ≥ 1 000 for GEO authority threshold.
 * Hard fail below 800 (minimum route threshold); warn between 800–999.
 * Missing stored wordCount is also a hard fail (the route should always persist it).
 */
function lintWordCount(post) {
  const v = post.wordCount;
  if (v == null || typeof v !== "number") {
    fail("wordCount       — not stored (DB column null; re-save post via the admin to recompute)");
    return false;
  }
  if (v < 800) {
    fail(`wordCount       — ${v} words (hard minimum: 800; add content before publishing)`);
    return false;
  }
  if (v < 1000) {
    warn(`wordCount       — ${v} words (below 1 000 GEO authority threshold; expand to ≥ 1 000 recommended)`);
    return true;
  }
  ok(`wordCount       — ${v} words (above 1 000-word GEO threshold)`);
  return true;
}

/**
 * Rule 10 — readingMinutes must be a positive integer.
 * Emitted in twitter:data1 and BlogPosting `timeRequired`. Zero or missing
 * suppresses both — hard fail.
 */
function lintReadingMinutes(post) {
  const v = post.readingMinutes;
  if (v == null || typeof v !== "number") {
    fail("readingMinutes  — missing (required for twitter:label1 and timeRequired JSON-LD)");
    return false;
  }
  if (!Number.isInteger(v) || v <= 0) {
    fail(`readingMinutes  — ${v} (must be a positive integer; got ${v})`);
    return false;
  }
  // Sanity: ~238 wpm; ±50% tolerance for dense/list-heavy posts.
  const wc = post.wordCount;
  if (wc && typeof wc === "number" && wc > 0) {
    const derivedMin = Math.max(1, Math.round(wc / 238));
    const ratio = v / derivedMin;
    if (ratio < 0.5 || ratio > 2.0) {
      warn(`readingMinutes  — ${v} min seems inconsistent with wordCount ${wc} (expected ~${derivedMin} min at 238 wpm)`);
      return true;
    }
  }
  ok(`readingMinutes  — ${v} min`);
  return true;
}

/**
 * Rule 11 — category must be one of the eight known fintech category slugs.
 * Unknown categories break the category sitemap, RSS feeds, and breadcrumb
 * JSON-LD. Hard fail.
 */
function lintCategory(post) {
  const v = post.category;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("category        — missing or empty");
    return false;
  }
  // Categories are stored as human-readable labels (e.g. "Payments") in the
  // DB seed; the linter converts to slug form for comparison.
  const slug = v.toLowerCase().replace(/\s+/g, "-");
  if (!KNOWN_CATEGORIES.has(slug) && !KNOWN_CATEGORIES.has(v)) {
    warn(`category        — "${v}" not in known category list (${[...KNOWN_CATEGORIES].join(", ")}). Update seoConstants.ts if this is a new category.`);
    return true;
  }
  ok(`category        — "${v}" (known category)`);
  return true;
}

/**
 * Rule 12 — seoTitle, when set, must be 50–70 chars.
 * Only checked when the override field is non-null. Skipped silently if null
 * (falling back to title is correct behaviour).
 */
function lintSeoTitle(post) {
  const v = post.seoTitle;
  if (v == null || v === "") {
    ok(`seoTitle        — not set (falls back to title)`);
    return true;
  }
  const len = v.length;
  if (len > 70) {
    fail(`seoTitle        — ${len} chars (limit: 70). Trim ${len - 70} char(s): "${v.slice(0, 40)}…"`);
    return false;
  }
  if (len < 50) {
    warn(`seoTitle        — ${len} chars (below 50; consider adding more keyword context)`);
    return true;
  }
  ok(`seoTitle        — ${len} chars (within 50–70-char window)`);
  return true;
}

/**
 * Rule 13 — seoDescription, when set, must be 150–160 chars.
 * Only checked when the override field is non-null. Warn below 150 (missed
 * SERP real-estate); hard fail above 160 (Google will truncate).
 */
function lintSeoDescription(post) {
  const v = post.seoDescription;
  if (v == null || v === "") {
    ok(`seoDescription  — not set (falls back to excerpt)`);
    return true;
  }
  const len = v.length;
  if (len > 160) {
    fail(`seoDescription  — ${len} chars (limit: 160). Trim ${len - 160} char(s).`);
    return false;
  }
  if (len < 150) {
    warn(`seoDescription  — ${len} chars (below 150; expand to use the full SERP description budget)`);
    return true;
  }
  ok(`seoDescription  — ${len} chars (within 150–160-char SERP budget)`);
  return true;
}

// ── Per-post lint ──────────────────────────────────────────────────────────────
function lintPost(post) {
  sub(`/${post.slug}`);
  const r1  = lintCoverImage(post);
  const r2  = lintExcerpt(post);
  const r3  = lintSlug(post);
  const r4  = lintTitle(post);
  const r5  = lintBlufSummary(post);
  const r6  = lintFaqItems(post);
  const r7  = lintAboutEntities(post);
  const r8  = lintTags(post);
  const r9  = lintWordCount(post);
  const r10 = lintReadingMinutes(post);
  const r11 = lintCategory(post);
  const r12 = lintSeoTitle(post);
  const r13 = lintSeoDescription(post);
  return r1 && r2 && r3 && r4 && r5 && r6 && r7 && r9 && r10 && r12 && r13;
}

// ── Entry point ────────────────────────────────────────────────────────────────
(async () => {
  console.log(
    `\n${C.bld}${C.cyn}FintechPressHub — Blog Post Content Linter${C.rst}`,
  );
  console.log(`${C.dim}  Target: ${BASE}${C.rst}`);
  if (filterSlug) console.log(`${C.dim}  Filter: --slug ${filterSlug}${C.rst}`);
  if (failFast)   console.log(`${C.dim}  Mode  : --fail-fast${C.rst}`);

  head("Fetching posts");

  let posts;
  try {
    const url = `${BASE}/api/blog/posts${filterSlug ? `/${filterSlug}` : "?limit=50"}`;
    console.log(`  ${C.cyn}▸${C.rst}  GET ${url}`);
    const { status, body } = await fetchJson(url);

    if (status !== 200) {
      console.log(`  ${C.red}✘${C.rst}  API returned HTTP ${status}`);
      process.exit(1);
    }

    posts = filterSlug ? [body] : body;
    if (!Array.isArray(posts)) posts = [posts];
    console.log(`  ${C.grn}✔${C.rst}  Retrieved ${posts.length} post(s)`);
  } catch (err) {
    console.log(`  ${C.red}✘${C.rst}  Could not reach API — ${err.message}`);
    console.log(`  ${C.dim}  Is the API server running at ${BASE}?${C.rst}`);
    process.exit(1);
  }

  head("Validating posts");

  for (const post of posts) {
    const ok = lintPost(post);
    if (!ok) {
      postsFailed++;
      if (failFast) {
        console.log(`\n  ${C.red}✘${C.rst}  --fail-fast: stopping after first failing post.\n`);
        break;
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  head("Summary");
  console.log(`  Posts checked       : ${posts.length}`);
  console.log(`  Posts with issues   : ${C.red}${postsFailed}${C.rst}`);
  console.log(`  ${C.grn}✔  Passed  : ${passed}${C.rst}`);
  if (warned > 0) console.log(`  ${C.yel}⚠  Warnings : ${warned}${C.rst}`);
  if (failed > 0) console.log(`  ${C.red}✘  Failed   : ${failed}${C.rst}`);
  else            console.log(`  ${C.dim}✘  Failed   : 0${C.rst}`);
  console.log(`\n  Rules checked       : 13 (①–⑬)`);
  console.log(`  Hard fails          : coverImage, excerpt, slug, title, blufSummary,`);
  console.log(`                        faqItems (≥ 3), aboutEntities, wordCount (≥ 800),`);
  console.log(`                        readingMinutes, seoTitle length, seoDescription length`);
  console.log(`  Warnings            : tags (< 3), wordCount (800–999), category unknown,`);
  console.log(`                        blufSummary > 500, readingMinutes inconsistency`);
  console.log("");

  if (failed > 0) {
    console.log(
      `  ${C.red}${C.bld}Blog post lint FAILED — fix the fields above before publishing.${C.rst}\n`,
    );
    process.exit(1);
  }

  console.log(
    `  ${C.grn}${C.bld}All posts passed content lint.${warned > 0 ? ` (${warned} warning(s) — review above)` : ""}${C.rst}\n`,
  );
})();
