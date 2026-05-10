import { logger } from "./logger";
import { STATIC_ROUTES, buildSitemapEntries } from "../routes/sitemap";

const LOG = logger.child({ component: "hreflang-check" });

const FETCH_TIMEOUT_MS = 10_000;

// Limit how much response body we buffer. The <head> of any real page is
// well under 16 KB; capping here avoids downloading full HTML for every
// URL we check, keeping the hreflang pass fast even on large sites.
const MAX_BODY_CHARS = 16_384;

const MAX_CONCURRENCY = 4;

// At most this many dynamic (blog / author) URLs are sampled per run.
// Template-level drift — the most common cause of hreflang mismatch —
// affects all pages uniformly, so a small sample is sufficient to catch it.
const DYNAMIC_SAMPLE_LIMIT = 5;

export type HreflangMismatchKind =
  | "fetch_error"           // Could not retrieve page HTML
  | "no_hreflang_tags"      // <head> has no <link rel="alternate" hreflang> at all
  | "missing_en"            // hreflang="en" tag absent
  | "missing_x_default"     // hreflang="x-default" tag absent
  | "self_ref_mismatch";    // hreflang="en" or "x-default" href ≠ canonical URL

export interface HreflangMismatch {
  url: string;
  kind: HreflangMismatchKind;
  detail: string;
}

interface HreflangTag {
  hreflang: string;
  href: string;
}

/**
 * Extract all <link rel="alternate" hreflang="..." href="..."> tags from
 * the <head> of an HTML string. Attribute order is not assumed. Returns
 * an empty array when no head element is found (should never happen on a
 * real page but the parser is graceful about it).
 */
function parseHreflangTags(html: string): HreflangTag[] {
  const headMatch = /(<head[\s\S]*?<\/head>)/i.exec(html);
  const haystack = headMatch ? headMatch[1] : html.slice(0, MAX_BODY_CHARS);

  const tags: HreflangTag[] = [];
  const linkRe = /<link\b([^>]*?)>/gi;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(haystack)) !== null) {
    const attrs = m[1];
    if (!/rel=["']alternate["']/i.test(attrs)) continue;
    const hlMatch = /hreflang=["']([^"']+)["']/i.exec(attrs);
    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    if (hlMatch && hrefMatch) {
      tags.push({ hreflang: hlMatch[1], href: hrefMatch[1] });
    }
  }

  return tags;
}

/**
 * Fetch the first MAX_BODY_CHARS characters of the page's HTML using a
 * streaming GET so we never download the full document. A ReadableStream
 * reader is used to cancel early after we have enough bytes to cover the
 * <head> section of any real page.
 */
async function fetchPageHead(
  url: string,
): Promise<{ body: string; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "FintechPressHub-HreflangChecker/1.0 (+https://www.fintechpresshub.com)",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      return { body: "", error: `HTTP ${res.status}` };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return { body: "", error: "no response body" };
    }

    let body = "";
    const decoder = new TextDecoder();
    try {
      while (body.length < MAX_BODY_CHARS) {
        const { done, value } = await reader.read();
        if (done) break;
        body += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    return { body, error: null };
  } catch (err) {
    return {
      body: "",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate a single page URL's hreflang set.
 *
 * Minimum correct set for a monolingual English site:
 *   <link rel="alternate" hreflang="en"        href="<canonical>">
 *   <link rel="alternate" hreflang="x-default" href="<canonical>">
 *
 * Both must point at the same canonical URL as the page itself. If
 * extra language variants (en-GB, en-AU, …) are present they are not
 * validated here — this check is specifically about the en / x-default
 * self-reference pair that PageMeta emits on every page.
 *
 * Returns null when the page passes validation.
 */
async function checkUrl(url: string): Promise<HreflangMismatch | null> {
  const { body, error } = await fetchPageHead(url);

  if (error || !body) {
    return { url, kind: "fetch_error", detail: error ?? "empty body" };
  }

  const tags = parseHreflangTags(body);

  if (tags.length === 0) {
    return {
      url,
      kind: "no_hreflang_tags",
      detail:
        "No <link rel=alternate hreflang> tags found in <head>. PageMeta may not be rendering on this route.",
    };
  }

  // Normalise trailing slashes for comparison. Canonical URLs in the
  // sitemap never have a trailing slash except the root ("/"), so strip
  // one if present — but only when it would produce a non-empty string.
  const norm = (href: string) =>
    href.length > 1 && href.endsWith("/") ? href.slice(0, -1) : href;
  const canonicalUrl = norm(url);

  const enTag = tags.find((t) => t.hreflang === "en");
  const xDefaultTag = tags.find((t) => t.hreflang === "x-default");

  if (!enTag) {
    return {
      url,
      kind: "missing_en",
      detail: `hreflang="en" tag not found. Tags present: ${
        tags.map((t) => `${t.hreflang}=${t.href}`).join(", ") || "none"
      }`,
    };
  }

  if (norm(enTag.href) !== canonicalUrl) {
    return {
      url,
      kind: "self_ref_mismatch",
      detail: `hreflang="en" href="${enTag.href}" ≠ canonical "${url}"`,
    };
  }

  if (!xDefaultTag) {
    return {
      url,
      kind: "missing_x_default",
      detail: `hreflang="x-default" tag not found. Tags present: ${
        tags.map((t) => `${t.hreflang}=${t.href}`).join(", ")
      }`,
    };
  }

  if (norm(xDefaultTag.href) !== canonicalUrl) {
    return {
      url,
      kind: "self_ref_mismatch",
      detail: `hreflang="x-default" href="${xDefaultTag.href}" ≠ canonical "${url}"`,
    };
  }

  return null; // OK
}

async function runWithConcurrency(
  items: string[],
  limit: number,
): Promise<(HreflangMismatch | null)[]> {
  const results: (HreflangMismatch | null)[] = new Array(items.length).fill(
    null,
  );
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await checkUrl(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/**
 * Run the hreflang consistency check against a representative sample of
 * the sitemap's page URLs and return any mismatches.
 *
 * Sampling strategy (two layers):
 *   1. All static route paths from STATIC_ROUTES (same list used to
 *      build the sitemap XML) — always included so template-level drift
 *      on core pages is never missed.
 *   2. Up to DYNAMIC_SAMPLE_LIMIT additional URLs from the live sitemap
 *      that are not already covered by the static list. These catch drift
 *      on individual blog / author pages.
 *
 * Template-level drift is the most common root cause (PageMeta not
 * rendering, wrong canonical base URL, etc.) and affects every page
 * uniformly, so a sample of ~30 URLs reliably catches it.
 */
// ---------------------------------------------------------------------------
// In-memory result cache
// ---------------------------------------------------------------------------
// The daily job populates this after every run so the admin dashboard can
// show the last-known results instantly without triggering a fresh crawl.
// Lost on server restart — acceptable; the GET route will show "never run"
// until the next daily tick or an admin manually triggers a check.

export interface HreflangCheckReport {
  generatedAt: string | null;
  checkedCount: number;
  mismatchCount: number;
  mismatches: HreflangMismatch[];
  dailyJobEnabled: boolean;
}

let cachedReport: HreflangCheckReport | null = null;

export function getCachedHreflangReport(): HreflangCheckReport {
  return (
    cachedReport ?? {
      generatedAt: null,
      checkedCount: 0,
      mismatchCount: 0,
      mismatches: [],
      dailyJobEnabled: isDailyHreflangEnabled(),
    }
  );
}

export function setCachedHreflangReport(
  mismatches: HreflangMismatch[],
  checkedCount: number,
): void {
  cachedReport = {
    generatedAt: new Date().toISOString(),
    checkedCount,
    mismatchCount: mismatches.length,
    mismatches,
    dailyJobEnabled: isDailyHreflangEnabled(),
  };
}

/**
 * Mirrors the gating logic used by the daily link-check job — the
 * hreflang check runs under the same environment gate.
 */
export function isDailyHreflangEnabled(): boolean {
  if (process.env["NODE_ENV"] === "production") return true;
  return Boolean(process.env["SITE_URL"]?.trim());
}

export async function runHreflangConsistencyCheck(
  siteUrl: string,
): Promise<{ mismatches: HreflangMismatch[]; checkedCount: number }> {
  const base = siteUrl.replace(/\/+$/, "");

  const staticUrls = STATIC_ROUTES.map((r) => `${base}${r.path}`);
  const staticSet = new Set(staticUrls);

  let dynamicUrls: string[] = [];
  try {
    const entries = await buildSitemapEntries();
    dynamicUrls = entries
      .map((e) => e.loc)
      .filter((u) => !staticSet.has(u))
      .slice(0, DYNAMIC_SAMPLE_LIMIT);
  } catch (err) {
    LOG.warn(
      { err },
      "hreflang-check: could not load sitemap entries for dynamic sample — static pages only",
    );
  }

  const allUrls = [...staticUrls, ...dynamicUrls];
  LOG.info(
    { static: staticUrls.length, dynamic: dynamicUrls.length, total: allUrls.length },
    "hreflang-check: starting consistency run",
  );

  const rawResults = await runWithConcurrency(allUrls, MAX_CONCURRENCY);
  const mismatches = rawResults.filter(
    (r): r is HreflangMismatch => r !== null,
  );
  const checkedCount = allUrls.length;

  LOG.info(
    { checked: checkedCount, mismatches: mismatches.length },
    "hreflang-check: run complete",
  );

  return { mismatches, checkedCount };
}
