import { db, pageLinkResultsTable, type PageLinkResultRow } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";
import { getSiteUrl } from "./seo";
import { buildSitemapEntries } from "../routes/sitemap";

const LOG = logger.child({ component: "internal-link-check" });

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONCURRENCY = 6;
const FALLBACK_GET_STATUSES = new Set([405, 501]);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageLinkBroken {
  sourcePage: string;
  linkUrl: string;
  statusCode: number | null;
  lastError: string | null;
  lastCheckedAt: string;
}

export interface InternalLinkCheckReport {
  generatedAt: string | null;
  pagesChecked: number;
  totalLinks: number;
  brokenCount: number;
  brokenLinks: PageLinkBroken[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchHead(url: string): Promise<{ statusCode: number | null; error: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "FintechPressHub-LinkChecker/1.0 (+https://www.fintechpresshub.com)" },
    });
    if (FALLBACK_GET_STATUSES.has(res.status)) {
      clearTimeout(timer);
      return fetchGet(url);
    }
    return { statusCode: res.status, error: null };
  } catch (err) {
    return { statusCode: null, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGet(url: string): Promise<{ statusCode: number | null; error: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "FintechPressHub-LinkChecker/1.0 (+https://www.fintechpresshub.com)" },
    });
    return { statusCode: res.status, error: null };
  } catch (err) {
    return { statusCode: null, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML link extraction ──────────────────────────────────────────────────────

/**
 * Fetches the HTML of a page and extracts all unique internal <a href> links.
 * "Internal" means same origin as siteUrl. Returns an empty array on fetch
 * error — we log but don't abort the whole run for one bad page.
 */
async function extractInternalLinks(pageUrl: string, siteOrigin: string): Promise<string[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let html = "";
  try {
    const res = await fetch(pageUrl, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "FintechPressHub-LinkChecker/1.0 (+https://www.fintechpresshub.com)" },
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch (err) {
    LOG.warn({ url: pageUrl, err }, "Failed to fetch page for link extraction");
    return [];
  } finally {
    clearTimeout(timer);
  }

  // Extract href values from <a> tags via regex — avoids pulling in an HTML
  // parser dependency. We only care about internal links so false positives
  // from e.g. data-href attributes are fine to skip later.
  const found = new Set<string>();
  const re = /href=["']([^"'#?][^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const resolved = new URL(raw, pageUrl);
      // Only keep same-origin links
      if (resolved.origin === siteOrigin) {
        // Normalise: strip hash + query (we only care the page exists)
        resolved.hash = "";
        resolved.search = "";
        const href = resolved.toString();
        // Skip the page itself and common non-content hrefs
        if (href !== pageUrl && !href.endsWith("#")) {
          found.add(href);
        }
      }
    } catch {
      // Malformed href — skip
    }
  }
  return [...found];
}

// ── Bounded concurrency runner ────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// ── Core check ───────────────────────────────────────────────────────────────

interface PageLink { sourcePage: string; linkUrl: string }
interface ProbeResult extends PageLink {
  statusCode: number | null;
  error: string | null;
  isBroken: boolean;
}

async function probeLink(pl: PageLink): Promise<ProbeResult> {
  const { statusCode, error } = await fetchHead(pl.linkUrl);
  const isBroken = statusCode === null || statusCode < 200 || statusCode >= 400;
  return { ...pl, statusCode, error, isBroken };
}

/**
 * Full internal-link scan:
 * 1. Walk the sitemap to get all page URLs.
 * 2. For each page, fetch HTML and extract internal <a href> links.
 * 3. Probe every (sourcePage, linkUrl) pair.
 * 4. Upsert results into `page_link_results`.
 */
export async function runInternalLinkCheck(): Promise<InternalLinkCheckReport> {
  const siteUrl = getSiteUrl();
  const siteOrigin = new URL(siteUrl).origin;

  LOG.info({ siteUrl }, "[internal-link-check] Starting scan");

  // Step 1: get page URLs from sitemap (reuse the same builder the sitemap
  // route uses — keeps the set of URLs consistent).
  const entries = await buildSitemapEntries();
  const pageUrls = entries.map((e) => e.loc);

  LOG.info({ pages: pageUrls.length }, "[internal-link-check] Crawling pages for links");

  // Step 2: extract links from each page (bounded concurrency)
  const linksByPage = await runWithConcurrency(pageUrls, MAX_CONCURRENCY, (pageUrl) =>
    extractInternalLinks(pageUrl, siteOrigin).then((links) => ({ pageUrl, links })),
  );

  // Step 3: build the flat probe list, deduplicating (sourcePage, linkUrl) pairs
  const seen = new Set<string>();
  const toProbe: PageLink[] = [];
  for (const { pageUrl, links } of linksByPage) {
    for (const linkUrl of links) {
      const key = `${pageUrl}|||${linkUrl}`;
      if (!seen.has(key)) {
        seen.add(key);
        toProbe.push({ sourcePage: pageUrl, linkUrl });
      }
    }
  }

  LOG.info({ pairs: toProbe.length }, "[internal-link-check] Probing links");

  // Step 4: probe all pairs with bounded concurrency
  const probed = await runWithConcurrency(toProbe, MAX_CONCURRENCY, probeLink);

  // Step 5: upsert into DB
  const now = new Date();
  if (probed.length > 0) {
    // Delete stale rows (links that no longer appear in any page)
    await db.execute(sql`DELETE FROM page_link_results WHERE last_checked_at < ${now}`);

    // Upsert all current pairs
    for (const p of probed) {
      await db
        .insert(pageLinkResultsTable)
        .values({
          sourcePage: p.sourcePage,
          linkUrl: p.linkUrl,
          lastStatusCode: p.statusCode,
          lastError: p.error,
          isBroken: p.isBroken,
          lastCheckedAt: now,
        })
        .onConflictDoUpdate({
          target: [pageLinkResultsTable.sourcePage, pageLinkResultsTable.linkUrl],
          set: {
            lastStatusCode: p.statusCode,
            lastError: p.error,
            isBroken: p.isBroken,
            lastCheckedAt: now,
          },
        });
    }
  }

  const brokenLinks: PageLinkBroken[] = probed
    .filter((p) => p.isBroken)
    .map((p) => ({
      sourcePage: p.sourcePage,
      linkUrl: p.linkUrl,
      statusCode: p.statusCode,
      lastError: p.error,
      lastCheckedAt: now.toISOString(),
    }));

  LOG.info(
    { total: probed.length, broken: brokenLinks.length },
    "[internal-link-check] Scan complete",
  );

  return {
    generatedAt: now.toISOString(),
    pagesChecked: pageUrls.length,
    totalLinks: probed.length,
    brokenCount: brokenLinks.length,
    brokenLinks,
  };
}

// ── Read stored report ────────────────────────────────────────────────────────

export async function getStoredInternalLinkReport(): Promise<InternalLinkCheckReport> {
  const rows: PageLinkResultRow[] = await db
    .select()
    .from(pageLinkResultsTable)
    .orderBy(pageLinkResultsTable.lastCheckedAt);

  if (rows.length === 0) {
    return { generatedAt: null, pagesChecked: 0, totalLinks: 0, brokenCount: 0, brokenLinks: [] };
  }

  const latestAt = rows.reduce(
    (max, r) => (r.lastCheckedAt > max ? r.lastCheckedAt : max),
    rows[0].lastCheckedAt,
  );

  const pagesChecked = new Set(rows.map((r) => r.sourcePage)).size;

  const brokenLinks: PageLinkBroken[] = rows
    .filter((r) => r.isBroken)
    .map((r) => ({
      sourcePage: r.sourcePage,
      linkUrl: r.linkUrl,
      statusCode: r.lastStatusCode ?? null,
      lastError: r.lastError ?? null,
      lastCheckedAt: r.lastCheckedAt.toISOString(),
    }));

  return {
    generatedAt: latestAt.toISOString(),
    pagesChecked,
    totalLinks: rows.length,
    brokenCount: brokenLinks.length,
    brokenLinks,
  };
}
