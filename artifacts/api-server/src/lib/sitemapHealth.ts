import { db, linkCheckResultsTable, type LinkCheckResultRow } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { logger } from "./logger";
import {
  buildSitemapEntries,
  type SitemapEntry,
  type SitemapEntrySource,
} from "../routes/sitemap";

const HEALTH_LOG = logger.child({ component: "sitemap-health" });

// Per-URL fetch timeout. Sitemap walks can be hundreds of URLs in
// production; we cap each individual request so a single slow URL can't
// stall the whole run. 8s is generous — well under the 24h job interval
// and typical browser timeouts.
const FETCH_TIMEOUT_MS = 8000;

// Limit the number of in-flight requests so we don't accidentally
// hammer the production server with hundreds of concurrent fetches
// during a daily run.
const MAX_CONCURRENCY = 8;

// Some hosts return 405 for HEAD; we fall back to a tiny GET when that
// happens so the link-checker never reports false positives.
const FALLBACK_GET_STATUSES = new Set([405, 501]);

export interface CheckedUrl {
  url: string;
  source: SitemapEntrySource | "manual";
  statusCode: number | null;
  error: string | null;
  isBroken: boolean;
}

export interface SitemapHealthReport {
  generatedAt: string | null;
  total: number;
  brokenCount: number;
  results: SerializedResult[];
}

export interface SerializedResult {
  url: string;
  source: string;
  lastStatusCode: number | null;
  lastError: string | null;
  isBroken: boolean;
  brokenSince: string | null;
  lastOkAt: string | null;
  lastCheckedAt: string;
  consecutiveFailures: number;
}

function serialize(row: LinkCheckResultRow): SerializedResult {
  return {
    url: row.url,
    source: row.source,
    lastStatusCode: row.lastStatusCode ?? null,
    lastError: row.lastError ?? null,
    isBroken: row.isBroken,
    brokenSince: row.brokenSince ? row.brokenSince.toISOString() : null,
    lastOkAt: row.lastOkAt ? row.lastOkAt.toISOString() : null,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
    consecutiveFailures: row.consecutiveFailures,
  };
}

/**
 * Fetch a single URL and return its status. Tries HEAD first to save
 * bandwidth; falls back to GET when the host doesn't support HEAD.
 */
async function fetchOnce(
  url: string,
  method: "HEAD" | "GET",
): Promise<{ statusCode: number | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // A few CDNs (Cloudflare in particular) treat unidentified bots
        // as suspicious. Identify ourselves explicitly so an admin
        // grepping access logs can correlate.
        "User-Agent": "FintechPressHub-LinkChecker/1.0 (+https://www.fintechpresshub.com)",
        Accept: "text/html,application/xml,application/xhtml+xml,*/*;q=0.5",
      },
    });
    return { statusCode: res.status, error: null };
  } catch (err) {
    return {
      statusCode: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(
  entry: SitemapEntry | { loc: string; source: "manual" },
): Promise<CheckedUrl> {
  const url = entry.loc;
  const source = entry.source as SitemapEntrySource | "manual";

  let { statusCode, error } = await fetchOnce(url, "HEAD");
  if (statusCode !== null && FALLBACK_GET_STATUSES.has(statusCode)) {
    const get = await fetchOnce(url, "GET");
    statusCode = get.statusCode;
    error = get.error;
  }

  const isBroken =
    statusCode === null || statusCode < 200 || statusCode >= 400;

  return { url, source, statusCode, error, isBroken };
}

/**
 * Run all checks with bounded concurrency. Order is preserved in the
 * returned array so the dashboard always shows static routes first.
 */
async function runWithConcurrency(
  entries: SitemapEntry[],
  limit: number,
): Promise<CheckedUrl[]> {
  const results: CheckedUrl[] = new Array(entries.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= entries.length) return;
      results[i] = await checkUrl(entries[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, entries.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export interface RunOptions {
  /**
   * When `true`, the persisted results are diffed against the previous
   * state and the function returns the URLs whose status flipped from
   * OK→broken on this run. The daily job uses this to decide whether to
   * email admins; the on-demand admin endpoint passes `false`.
   */
  detectTransitions: boolean;
}

export interface RunOutcome {
  results: SerializedResult[];
  newlyBroken: SerializedResult[];
  recovered: SerializedResult[];
}

/**
 * Walk the sitemap, fetch every URL, persist the latest status per URL
 * (upsert on `url`), and return the report. When `detectTransitions` is
 * true, the per-URL OK→broken transitions are surfaced separately so a
 * caller (the daily job) can email admins about *new* breakage only.
 */
export async function runSitemapCheck(
  options: RunOptions,
): Promise<RunOutcome> {
  const entries = await buildSitemapEntries();
  HEALTH_LOG.info({ count: entries.length }, "Starting sitemap health run");

  const checked = await runWithConcurrency(entries, MAX_CONCURRENCY);
  const now = new Date();

  // Pull the previous state for every URL we just checked so we can
  // detect OK→broken transitions and preserve `brokenSince` / counters.
  const urls = checked.map((c) => c.url);
  const previous = urls.length
    ? await db
        .select()
        .from(linkCheckResultsTable)
        .where(sql`${linkCheckResultsTable.url} IN ${urls}`)
    : [];
  const prevByUrl = new Map<string, LinkCheckResultRow>();
  for (const p of previous) prevByUrl.set(p.url, p);

  const newlyBroken: SerializedResult[] = [];
  const recovered: SerializedResult[] = [];
  const persisted: SerializedResult[] = [];

  for (const c of checked) {
    const prev = prevByUrl.get(c.url) ?? null;
    const wasBroken = prev?.isBroken ?? false;

    const brokenSince = c.isBroken
      ? prev?.brokenSince ?? now
      : null;
    const lastOkAt = c.isBroken ? prev?.lastOkAt ?? null : now;
    const consecutiveFailures = c.isBroken
      ? (prev?.consecutiveFailures ?? 0) + 1
      : 0;
    // We only mark `notifiedAt` when the daily job actually emails about
    // this URL. On the first transition OK→broken we leave it null so
    // `runDailyLinkCheck` knows to fire the email; on subsequent days
    // (still broken) it stays set so we don't spam.
    const notifiedAt = c.isBroken
      ? wasBroken
        ? prev?.notifiedAt ?? null
        : null
      : null;

    const values = {
      url: c.url,
      source: c.source,
      lastStatusCode: c.statusCode,
      lastError: c.error,
      isBroken: c.isBroken,
      brokenSince,
      lastOkAt,
      lastCheckedAt: now,
      consecutiveFailures,
      notifiedAt,
    };

    const [row] = await db
      .insert(linkCheckResultsTable)
      .values(values)
      .onConflictDoUpdate({
        target: linkCheckResultsTable.url,
        set: {
          source: values.source,
          lastStatusCode: values.lastStatusCode,
          lastError: values.lastError,
          isBroken: values.isBroken,
          brokenSince: values.brokenSince,
          lastOkAt: values.lastOkAt,
          lastCheckedAt: values.lastCheckedAt,
          consecutiveFailures: values.consecutiveFailures,
          notifiedAt: values.notifiedAt,
        },
      })
      .returning();

    if (!row) continue;
    const ser = serialize(row);
    persisted.push(ser);

    if (options.detectTransitions) {
      if (c.isBroken && !wasBroken) newlyBroken.push(ser);
      if (!c.isBroken && wasBroken) recovered.push(ser);
    }
  }

  HEALTH_LOG.info(
    {
      total: persisted.length,
      brokenCount: persisted.filter((p) => p.isBroken).length,
      newlyBroken: newlyBroken.length,
      recovered: recovered.length,
    },
    "Sitemap health run complete",
  );

  return { results: persisted, newlyBroken, recovered };
}

/**
 * Read-only view of the persisted state — does not trigger any fetches.
 * Used by `GET /admin/sitemap-health` so the dashboard can render
 * instantly without waiting on the network.
 */
export async function getStoredSitemapHealth(): Promise<SitemapHealthReport> {
  const rows = await db
    .select()
    .from(linkCheckResultsTable)
    .orderBy(
      // Sort: broken first (so the worst stuff is at the top), then by
      // most recent check so the freshest data wins ties.
      desc(linkCheckResultsTable.isBroken),
      desc(linkCheckResultsTable.lastCheckedAt),
    );
  const results = rows.map(serialize);
  const generatedAt = rows.length
    ? rows.reduce<Date>(
        (latest, r) => (r.lastCheckedAt > latest ? r.lastCheckedAt : latest),
        rows[0].lastCheckedAt,
      ).toISOString()
    : null;
  return {
    generatedAt,
    total: results.length,
    brokenCount: results.filter((r) => r.isBroken).length,
    results,
  };
}

/**
 * Mark a set of URLs as "we just emailed about these" so the next daily
 * run won't re-notify. Pulled out of `runSitemapCheck` so the email
 * delivery and the persistence are explicitly separate steps — if the
 * email send fails, we never set `notifiedAt`, and the next run will try
 * again.
 */
export async function markNotified(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await db
    .update(linkCheckResultsTable)
    .set({ notifiedAt: new Date() })
    .where(sql`${linkCheckResultsTable.url} IN ${urls}`);
}

export function buildReport(results: SerializedResult[]): SitemapHealthReport {
  const generatedAt = results.length
    ? results.reduce(
        (latest, r) => (r.lastCheckedAt > latest ? r.lastCheckedAt : latest),
        results[0].lastCheckedAt,
      )
    : null;
  return {
    generatedAt,
    total: results.length,
    brokenCount: results.filter((r) => r.isBroken).length,
    results,
  };
}
