#!/usr/bin/env node
/**
 * scripts/lint-blog-post.mjs
 *
 * Structured content linter for blog posts.
 * Validates every post for SEO-critical field hygiene:
 *
 *   ① coverImage  — non-empty, valid http/https URL
 *   ② excerpt     — present, ≤ 160 characters (meta-description budget)
 *   ③ slug        — lowercase alphanumeric + hyphens only;
 *                   no leading, trailing, or consecutive hyphens
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
    fail("coverImage  — missing or empty");
    return false;
  }
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      fail(`coverImage  — invalid protocol "${u.protocol}" (must be http or https): ${v}`);
      return false;
    }
    ok(`coverImage  — valid URL`);
    return true;
  } catch {
    fail(`coverImage  — not a valid URL: "${v}"`);
    return false;
  }
}

/** Rule 2 — excerpt must be present and ≤ 160 characters. */
function lintExcerpt(post) {
  const v = post.excerpt;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("excerpt     — missing or empty");
    return false;
  }
  const len = v.length;
  if (len > 160) {
    fail(`excerpt     — ${len} chars (limit: 160). Trim ${len - 160} char(s): "${v.slice(0, 40)}…"`);
    return false;
  }
  if (len > 155) {
    warn(`excerpt     — ${len} chars (close to 160-char limit; consider trimming)`);
    return true;
  }
  ok(`excerpt     — ${len} chars (within 160-char budget)`);
  return true;
}

/** Rule 3 — slug must be lowercase alphanumeric with hyphens; no leading/trailing/consecutive hyphens. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function lintSlug(post) {
  const v = post.slug;
  if (!v || typeof v !== "string" || v.trim() === "") {
    fail("slug        — missing or empty");
    return false;
  }
  if (v !== v.toLowerCase()) {
    fail(`slug        — contains uppercase letters: "${v}"`);
    return false;
  }
  if (!SLUG_RE.test(v)) {
    if (/\s/.test(v))              fail(`slug        — contains whitespace: "${v}"`);
    else if (/^-|-$/.test(v))      fail(`slug        — leading or trailing hyphen: "${v}"`);
    else if (/--/.test(v))         fail(`slug        — consecutive hyphens: "${v}"`);
    else if (/[^a-z0-9-]/.test(v)) fail(`slug        — invalid characters (only a-z, 0-9, hyphen allowed): "${v}"`);
    else                           fail(`slug        — invalid format: "${v}"`);
    return false;
  }
  ok(`slug        — valid format`);
  return true;
}

// ── Per-post lint ──────────────────────────────────────────────────────────────
function lintPost(post) {
  sub(`/${post.slug}`);
  const r1 = lintCoverImage(post);
  const r2 = lintExcerpt(post);
  const r3 = lintSlug(post);
  return r1 && r2 && r3;
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
  console.log(`  Posts checked  : ${posts.length}`);
  console.log(`  Posts with issues : ${C.red}${postsFailed}${C.rst}`);
  console.log(`  ${C.grn}✔  Passed  : ${passed}${C.rst}`);
  if (warned > 0) console.log(`  ${C.yel}⚠  Warnings: ${warned}${C.rst}`);
  if (failed > 0) console.log(`  ${C.red}✘  Failed  : ${failed}${C.rst}`);
  else            console.log(`  ${C.dim}✘  Failed  : 0${C.rst}`);
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
