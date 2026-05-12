#!/usr/bin/env node
/**
 * scripts/validate-seo-files.mjs
 *
 * Pre-deploy validator for robots.txt and XML sitemaps.
 * Targets the Express API server (default: http://localhost:8080).
 *
 * Exit 0 → all hard checks passed (warnings allowed).
 * Exit 1 → at least one hard check failed.
 *
 * Usage:
 *   node scripts/validate-seo-files.mjs [BASE_URL]
 *
 * BASE_URL defaults to http://localhost:8080.
 */

import { get } from "node:http";

const BASE = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");

// ── Terminal colours ───────────────────────────────────────────────────────────
const C = {
  grn: "\x1b[32m", red: "\x1b[31m", yel: "\x1b[33m",
  cyn: "\x1b[36m", dim: "\x1b[2m",  bld: "\x1b[1m",  rst: "\x1b[0m",
};

let passed = 0;
let failed = 0;
let warned = 0;

function ok(msg)   { console.log(`  ${C.grn}✔${C.rst}  ${msg}`); passed++; }
function fail(msg) { console.log(`  ${C.red}✘${C.rst}  ${msg}`); failed++; }
function warn(msg) { console.log(`  ${C.yel}⚠${C.rst}  ${msg}`); warned++; }
function info(msg) { console.log(`  ${C.cyn}▸${C.rst}  ${msg}`); }
function head(msg) { console.log(`\n${C.bld}${C.cyn}──  ${msg}  ${C.rst}`); }

// ── HTTP helper ────────────────────────────────────────────────────────────────
function fetch(url, { maxBytes = 512_000, timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = get(url, { timeout }, (res) => {
      const chunks = [];
      let total = 0;
      res.on("data", (chunk) => {
        total += chunk.length;
        if (total <= maxBytes) chunks.push(chunk);
      });
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    });
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timed out: ${url}`)); });
    req.on("error", reject);
  });
}

// ── robots.txt checks ─────────────────────────────────────────────────────────
async function checkRobots() {
  head("robots.txt");
  const url = `${BASE}/robots.txt`;
  info(`GET ${url}`);

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    fail(`Could not reach robots.txt — ${err.message}`);
    fail("Is the API server (port 8080) running? Start the 'Start application' workflow first.");
    return [];
  }

  // ── HTTP status ──────────────────────────────────────────────────────────────
  if (res.status === 200) {
    ok(`HTTP 200 OK`);
  } else {
    fail(`Expected HTTP 200, got ${res.status}`);
  }

  // ── Content-Type ─────────────────────────────────────────────────────────────
  const ct = res.headers["content-type"] ?? "";
  if (ct.startsWith("text/plain")) {
    ok(`Content-Type: ${ct}`);
  } else {
    warn(`Content-Type is "${ct}" — expected text/plain`);
  }

  const body = res.body;

  // ── Required directives ───────────────────────────────────────────────────────
  if (/^User-agent:\s*\*/m.test(body)) {
    ok("Contains User-agent: * block");
  } else {
    fail("Missing User-agent: * block");
  }

  if (/^Allow:\s*\/$/m.test(body)) {
    ok("Wildcard block allows / (not blocked)");
  } else {
    warn("No explicit Allow: / found in User-agent: * block");
  }

  if (/^Disallow:\s*\/admin/m.test(body)) {
    ok("Admin routes disallowed");
  } else {
    warn("No Disallow: /admin found — admin pages may be crawled");
  }

  if (/^Disallow:\s*\/api\//m.test(body)) {
    ok("API routes disallowed");
  } else {
    warn("No Disallow: /api/ found — API endpoints may be crawled");
  }

  // ── Sitemap declarations ──────────────────────────────────────────────────────
  const sitemapLines = body
    .split("\n")
    .filter((l) => /^Sitemap:/i.test(l.trim()))
    .map((l) => l.replace(/^Sitemap:\s*/i, "").trim());

  if (sitemapLines.length > 0) {
    ok(`${sitemapLines.length} Sitemap: directive(s) declared`);
    for (const u of sitemapLines) info(`  → ${u}`);
  } else {
    fail("No Sitemap: directives found in robots.txt");
  }

  // Check sitemap_index.xml is referenced
  const hasIndex = sitemapLines.some((u) => u.includes("sitemap_index.xml"));
  if (hasIndex) {
    ok("sitemap_index.xml is declared in robots.txt");
  } else {
    fail("sitemap_index.xml is NOT declared in robots.txt");
  }

  // Return the sitemap paths so we can validate them next
  return sitemapLines.map((u) => {
    try { return new URL(u).pathname; } catch { return null; }
  }).filter(Boolean);
}

// ── Sitemap index + child sitemaps ────────────────────────────────────────────
async function checkSitemapIndex(declaredPaths) {
  head("sitemap_index.xml");
  const url = `${BASE}/sitemap_index.xml`;
  info(`GET ${url}`);

  let res;
  try {
    res = await fetch(url, { maxBytes: 1_024_000 });
  } catch (err) {
    fail(`Could not reach sitemap_index.xml — ${err.message}`);
    return [];
  }

  if (res.status === 200) {
    ok("HTTP 200 OK");
  } else {
    fail(`Expected HTTP 200, got ${res.status}`);
    return [];
  }

  const ct = res.headers["content-type"] ?? "";
  if (/xml/.test(ct)) {
    ok(`Content-Type: ${ct}`);
  } else {
    warn(`Content-Type is "${ct}" — expected application/xml`);
  }

  const xml = res.body;

  if (xml.trimStart().startsWith("<?xml")) {
    ok("Response starts with XML declaration");
  } else {
    fail("Response does not start with <?xml — may not be valid XML");
  }

  if (/<sitemapindex[\s>]/i.test(xml)) {
    ok("Root element is <sitemapindex>");
  } else {
    fail("Root element is not <sitemapindex> — wrong document type");
  }

  // Extract child <loc> URLs from the index
  const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locMatches.length > 0) {
    ok(`${locMatches.length} child sitemap(s) listed`);
  } else {
    fail("No <loc> entries found in sitemap_index.xml");
    return [];
  }

  // Check declared sitemaps in robots.txt are reachable
  for (const path of declaredPaths) {
    const inIndex = locMatches.some((u) => {
      try { return new URL(u).pathname === path; } catch { return false; }
    });
    if (path !== "/sitemap_index.xml" && !inIndex && path !== "/sitemap.xml" && path !== "/news-sitemap.xml") {
      warn(`robots.txt declares "${path}" but it is not listed in sitemap_index.xml`);
    }
  }

  return locMatches;
}

async function checkChildSitemaps(childUrls) {
  // Validate a representative sample: pages, blog, locations, glossary, news
  const PRIORITY_PATHS = [
    "/sitemap-pages.xml",
    "/sitemap-blog.xml",
    "/sitemap-locations.xml",
    "/sitemap-glossary.xml",
    "/news-sitemap.xml",
    "/sitemap.xml",
  ];

  // Build the set to check: priority paths first, then up to 4 more
  const toCheck = [];
  for (const path of PRIORITY_PATHS) {
    const matching = childUrls.find((u) => {
      try { return new URL(u).pathname === path; } catch { return false; }
    });
    if (matching) toCheck.push(matching);
  }
  // Add any remaining child sitemaps not yet covered (up to 4)
  for (const u of childUrls) {
    if (toCheck.length >= PRIORITY_PATHS.length + 4) break;
    if (!toCheck.includes(u)) toCheck.push(u);
  }

  head(`Child Sitemaps (${toCheck.length} of ${childUrls.length} checked)`);

  for (const sitemapUrl of toCheck) {
    let path;
    try { path = new URL(sitemapUrl).pathname; } catch { path = sitemapUrl; }

    // Always fetch from localhost, regardless of what SITE_URL is in the XML
    const localUrl = `${BASE}${path}`;
    info(`GET ${localUrl}`);

    let res;
    try {
      res = await fetch(localUrl, { maxBytes: 256_000 });
    } catch (err) {
      fail(`${path} — unreachable: ${err.message}`);
      continue;
    }

    if (res.status !== 200) {
      fail(`${path} — HTTP ${res.status}`);
      continue;
    }

    const xml = res.body;

    if (!xml.trimStart().startsWith("<?xml")) {
      fail(`${path} — does not start with <?xml declaration`);
      continue;
    }

    const hasUrlset      = /<urlset[\s>]/i.test(xml);
    const hasSitemapIdx  = /<sitemapindex[\s>]/i.test(xml);

    if (!hasUrlset && !hasSitemapIdx) {
      fail(`${path} — neither <urlset> nor <sitemapindex> found`);
      continue;
    }

    // Count <url> entries (rough check — not a full XML parse)
    const urlCount = (xml.match(/<url>/g) ?? []).length;
    if (hasUrlset && urlCount === 0) {
      warn(`${path} — is a valid <urlset> but contains 0 <url> entries`);
    } else if (hasUrlset) {
      ok(`${path} — valid <urlset>, ${urlCount} URL(s)`);
    } else {
      const sitemapCount = (xml.match(/<sitemap>/g) ?? []).length;
      ok(`${path} — valid <sitemapindex>, ${sitemapCount} child sitemap(s)`);
    }
  }
}

// ── Legacy sitemap.xml ─────────────────────────────────────────────────────────
async function checkLegacySitemap() {
  head("sitemap.xml (legacy fallback)");
  const url = `${BASE}/sitemap.xml`;
  info(`GET ${url}`);

  let res;
  try {
    res = await fetch(url, { maxBytes: 256_000 });
  } catch (err) {
    fail(`Could not reach sitemap.xml — ${err.message}`);
    return;
  }

  if (res.status === 200) {
    ok("HTTP 200 OK");
  } else {
    fail(`Expected HTTP 200, got ${res.status}`);
    return;
  }

  const xml = res.body;
  const urlCount = (xml.match(/<url>/g) ?? []).length;

  if (/<urlset[\s>]/i.test(xml) && urlCount > 0) {
    ok(`Valid <urlset> with ${urlCount} URL(s)`);
  } else if (urlCount === 0) {
    warn("sitemap.xml has 0 <url> entries — check DB data");
  } else {
    fail("sitemap.xml does not contain a valid <urlset>");
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────
(async () => {
  console.log(
    `\n${C.bld}${C.cyn}FintechPressHub — robots.txt & Sitemap Validator${C.rst}`,
  );
  console.log(`${C.dim}  Target: ${BASE}${C.rst}`);

  const sitemapPaths = await checkRobots();
  const childUrls    = await checkSitemapIndex(sitemapPaths);
  if (childUrls.length > 0) await checkChildSitemaps(childUrls);
  await checkLegacySitemap();

  // ── Summary ──────────────────────────────────────────────────────────────────
  head("Summary");
  console.log(`  ${C.grn}✔  Passed  : ${passed}${C.rst}`);
  if (warned > 0)  console.log(`  ${C.yel}⚠  Warnings: ${warned}${C.rst}`);
  if (failed > 0)  console.log(`  ${C.red}✘  Failed  : ${failed}${C.rst}`);
  else             console.log(`  ${C.dim}✘  Failed  : 0${C.rst}`);
  console.log("");

  if (failed > 0) {
    console.log(
      `  ${C.red}${C.bld}SEO file validation FAILED — fix the errors above before deploying.${C.rst}\n`,
    );
    process.exit(1);
  }

  console.log(
    `  ${C.grn}${C.bld}All hard checks passed.${warned > 0 ? ` (${warned} warning(s) — review above)` : ""}${C.rst}\n`,
  );
})();
