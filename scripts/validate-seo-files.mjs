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

import { get, request as httpRequest } from "node:http";

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

// ── HTTP helpers ───────────────────────────────────────────────────────────────
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

// HEAD-only request — fetches status + headers without downloading the body.
// Used by the X-Robots-Tag check to avoid pulling full HTML/XML payloads.
function headRequest(url, { timeout = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname, search } = new URL(url);
    const req = httpRequest(
      { hostname, port: port || 80, path: pathname + search, method: "HEAD", timeout },
      (res) => {
        res.resume(); // drain (HEAD has no body, but drain prevents hangs)
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
      },
    );
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timed out: ${url}`)); });
    req.on("error", reject);
    req.end();
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

  // Extract child <sitemap> blocks — each has exactly one <loc> and one <lastmod>.
  // We parse them as blocks so we can correlate loc with lastmod without a full XML parse.
  const sitemapBlocks = [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi)].map((m) => {
    const block = m[1];
    const loc     = (block.match(/<loc>([^<]+)<\/loc>/i)     ?? [])[1]?.trim() ?? "";
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/i) ?? [])[1]?.trim() ?? "";
    return { loc, lastmod };
  });

  const locMatches = sitemapBlocks.map((b) => b.loc).filter(Boolean);

  if (locMatches.length > 0) {
    ok(`${locMatches.length} child sitemap(s) listed`);
  } else {
    fail("No <loc> entries found in sitemap_index.xml");
    return [];
  }

  // ── Lastmod staleness check ─────────────────────────────────────────────────
  // Sitemaps whose lastmod is stale mislead Googlebot into skipping crawls of
  // content that may have changed. Thresholds are tuned per content type:
  //   • Dynamic content (blog, pages, tags, authors, locations, glossary): 30 days
  //     — these reflect DB dates so they should update whenever content does.
  //   • Static content (services, tools, compare): 90 days
  //     — these have hand-curated dates that change only on content edits.
  //   • news-sitemap.xml: always today — warn if date is > 1 day old.
  const STATIC_SITEMAPS = new Set(["/sitemap-services.xml", "/sitemap-tools.xml", "/sitemap-compare.xml"]);
  const now = Date.now();
  const DAY_MS = 86_400_000;

  for (const { loc, lastmod } of sitemapBlocks) {
    if (!loc || !lastmod) continue;
    let path;
    try { path = new URL(loc).pathname; } catch { path = loc; }

    const lastmodMs = new Date(lastmod).getTime();
    if (isNaN(lastmodMs)) {
      warn(`${path} — lastmod "${lastmod}" is not a valid date`);
      continue;
    }

    const agedays = Math.floor((now - lastmodMs) / DAY_MS);

    if (path === "/news-sitemap.xml") {
      // News sitemap lastmod is always set to today in sitemapIndex.ts.
      // If it's more than 1 day old the sitemap route may have broken.
      if (agedays > 1) {
        warn(`${path} — lastmod is ${agedays} day(s) old (expected: today) — check the news sitemap route`);
      } else {
        ok(`${path} — lastmod is current (${lastmod})`);
      }
    } else if (STATIC_SITEMAPS.has(path)) {
      if (agedays > 90) {
        warn(`${path} — lastmod is ${agedays} day(s) old (threshold: 90 days for static sitemaps) — update seoConstants.ts if content has changed`);
      } else {
        ok(`${path} — lastmod ${lastmod} (${agedays}d old, within 90-day static threshold)`);
      }
    } else {
      if (agedays > 30) {
        warn(`${path} — lastmod is ${agedays} day(s) old (threshold: 30 days) — check if new content is being published and dated correctly`);
      } else {
        ok(`${path} — lastmod ${lastmod} (${agedays}d old, within 30-day dynamic threshold)`);
      }
    }
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

/**
 * Returns true if any blog post has publishedAt within the last 48 hours.
 * The news sitemap uses the same 48-hour window, so this tells us whether
 * an empty news-sitemap.xml is expected or suspicious.
 */
async function hasRecentBlogPosts() {
  try {
    const res = await fetch(`${BASE}/api/blog/posts`, { maxBytes: 256_000 });
    if (res.status !== 200) return null; // can't tell — skip the check
    const posts = JSON.parse(res.body);
    const list = Array.isArray(posts) ? posts : (posts.posts ?? posts.data ?? []);
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return list.some((p) => p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff);
  } catch {
    return null; // network or parse error — skip the check
  }
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
      if (path === "/news-sitemap.xml") {
        // The news sitemap only includes posts from the last 48 hours.
        // An empty sitemap is perfectly normal when no posts were published
        // recently — only warn when there ARE recent posts missing from it.
        const recentPosts = await hasRecentBlogPosts();
        if (recentPosts === true) {
          warn(`${path} — 0 entries but recent posts (< 48 h) exist — check newsSitemap route`);
        } else if (recentPosts === false) {
          info(`${path} — empty (no posts published in the last 48 h — expected)`);
          passed++;
        } else {
          // Could not determine (API error) — report informational, don't block
          info(`${path} — empty (could not verify recent-post status; skipping check)`);
          passed++;
        }
      } else {
        warn(`${path} — is a valid <urlset> but contains 0 <url> entries`);
      }
    } else if (hasUrlset) {
      ok(`${path} — valid <urlset>, ${urlCount} URL(s)`);
    } else {
      const sitemapCount = (xml.match(/<sitemap>/g) ?? []).length;
      ok(`${path} — valid <sitemapindex>, ${sitemapCount} child sitemap(s)`);
    }
  }
}

// ── X-Robots-Tag header checks ────────────────────────────────────────────────
// Verifies that the Express middleware applies the correct X-Robots-Tag header
// to every route category. The three cases:
//
//   Public pages  → must have max-snippet directives, must NOT have noindex
//   Admin routes  → must have noindex, nofollow (gated by first middleware)
//   Assets / API  → no X-Robots-Tag expected; must not have noindex
//
// Uses HEAD requests to avoid downloading page bodies.
async function checkXRobotsHeaders() {
  head("X-Robots-Tag Headers");

  // One representative URL per page template
  const PUBLIC_PAGES = [
    "/",
    "/blog",
    "/blog/fintech-seo-strategy-2026",
    "/services",
    "/pricing",
    "/locations/london",
    "/glossary/api",
  ];

  // Admin routes must be blocked
  const ADMIN_PAGES = ["/admin", "/admin/blog"];

  // These must not carry noindex even by accident
  const NON_HTML_ROUTES = ["/sitemap.xml", "/api/healthz"];

  const PUBLIC_EXPECTED = "max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  for (const path of PUBLIC_PAGES) {
    let res;
    try {
      res = await headRequest(`${BASE}${path}`);
    } catch (err) {
      warn(`${path} — could not check headers: ${err.message}`);
      continue;
    }
    const tag = res.headers["x-robots-tag"] ?? "";
    if (/noindex|nofollow/i.test(tag)) {
      fail(`${path} — X-Robots-Tag leaks noindex/nofollow: "${tag}"`);
    } else if (tag === PUBLIC_EXPECTED) {
      ok(`${path} — X-Robots-Tag correct`);
    } else if (tag) {
      warn(`${path} — X-Robots-Tag unexpected value: "${tag}"`);
    } else {
      warn(`${path} — X-Robots-Tag header absent (expected: ${PUBLIC_EXPECTED})`);
    }
  }

  for (const path of ADMIN_PAGES) {
    let res;
    try {
      res = await headRequest(`${BASE}${path}`);
    } catch (err) {
      warn(`${path} — could not check headers: ${err.message}`);
      continue;
    }
    const tag = res.headers["x-robots-tag"] ?? "";
    if (/noindex/i.test(tag) && /nofollow/i.test(tag)) {
      ok(`${path} — X-Robots-Tag: "${tag}" (correctly blocked)`);
    } else {
      fail(`${path} — admin route not blocked; X-Robots-Tag: "${tag || "(none)"}"`);
    }
  }

  for (const path of NON_HTML_ROUTES) {
    let res;
    try {
      res = await headRequest(`${BASE}${path}`);
    } catch (err) {
      warn(`${path} — could not check headers: ${err.message}`);
      continue;
    }
    const tag = res.headers["x-robots-tag"] ?? "";
    if (/noindex|nofollow/i.test(tag)) {
      fail(`${path} — unexpected noindex/nofollow on non-HTML route: "${tag}"`);
    } else {
      ok(`${path} — no noindex on asset/API route (correct)`);
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
  await checkXRobotsHeaders();

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
