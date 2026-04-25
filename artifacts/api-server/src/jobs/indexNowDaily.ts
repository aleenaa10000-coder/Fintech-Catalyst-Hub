import { db, blogPostsTable, kvStoreTable } from "@workspace/db";
import { gt, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";

const JOB_LOG = logger.child({ job: "indexnow-daily" });

const KV_KEY = "indexnow:lastRunAt";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_MS = 36 * 60 * 60 * 1000; // 36h cap on first run / after long downtime
const OVERLAP_MS = 60 * 60 * 1000; // 1h overlap with previous window

interface KvLastRun {
  at: string; // ISO timestamp
}

async function readLastRunAt(): Promise<Date | null> {
  const rows = await db
    .select()
    .from(kvStoreTable)
    .where(eq(kvStoreTable.key, KV_KEY))
    .limit(1);
  if (rows.length === 0) return null;
  const value = rows[0].value as KvLastRun | null;
  if (!value?.at) return null;
  const parsed = new Date(value.at);
  return isNaN(parsed.getTime()) ? null : parsed;
}

async function writeLastRunAt(at: Date): Promise<void> {
  const value: KvLastRun = { at: at.toISOString() };
  await db
    .insert(kvStoreTable)
    .values({ key: KV_KEY, value })
    .onConflictDoUpdate({
      target: kvStoreTable.key,
      set: { value, updatedAt: new Date() },
    });
}

interface IndexNowConfig {
  siteUrl: string;
  host: string;
  key: string;
  keyLocation: string;
}

function loadConfig(): IndexNowConfig | null {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return null;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    JOB_LOG.warn(
      "INDEXNOW_KEY is set but does not match the required format ([a-zA-Z0-9-]{8,128}); skipping",
    );
    return null;
  }
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  return {
    siteUrl,
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/indexnow-key.txt`,
  };
}

async function submitToIndexNow(
  config: IndexNowConfig,
  urlList: string[],
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList,
    }),
  });
  const body = await res.text();
  return { ok: res.ok || res.status === 202, status: res.status, body };
}

export async function runIndexNowDaily(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    JOB_LOG.debug("INDEXNOW_KEY not configured; skipping daily run");
    return;
  }

  const now = new Date();
  const lastRunAt = await readLastRunAt();

  // Window: posts published since (lastRunAt - 1h overlap), capped at 36h back.
  const earliestAllowed = new Date(now.getTime() - MAX_LOOKBACK_MS);
  let since: Date;
  if (lastRunAt) {
    const candidate = new Date(lastRunAt.getTime() - OVERLAP_MS);
    since = candidate < earliestAllowed ? earliestAllowed : candidate;
  } else {
    since = earliestAllowed;
  }

  const recentPosts = await db
    .select({ slug: blogPostsTable.slug })
    .from(blogPostsTable)
    .where(gt(blogPostsTable.publishedAt, since));

  if (recentPosts.length === 0) {
    JOB_LOG.info(
      { since: since.toISOString() },
      "No new blog posts since last run; nothing to submit",
    );
    await writeLastRunAt(now);
    return;
  }

  const urlList = recentPosts.map((p) => `${config.siteUrl}/blog/${p.slug}`);

  JOB_LOG.info(
    { count: urlList.length, since: since.toISOString(), host: config.host },
    "Submitting blog post URLs to IndexNow",
  );

  try {
    const result = await submitToIndexNow(config, urlList);
    if (result.ok) {
      JOB_LOG.info(
        { status: result.status, count: urlList.length },
        "IndexNow accepted submission",
      );
      await writeLastRunAt(now);
    } else {
      JOB_LOG.error(
        { status: result.status, body: result.body.slice(0, 500) },
        "IndexNow rejected submission; will retry tomorrow",
      );
    }
  } catch (err) {
    JOB_LOG.error({ err }, "IndexNow submission threw; will retry tomorrow");
  }
}

let scheduled = false;

export function scheduleIndexNowDaily(): void {
  if (scheduled) return;
  scheduled = true;

  if (!process.env.INDEXNOW_KEY) {
    JOB_LOG.info(
      "INDEXNOW_KEY not set — daily IndexNow sync is disabled. " +
        "Set INDEXNOW_KEY (8-128 chars, [a-zA-Z0-9-]) to enable automatic " +
        "submission of newly published blog posts to Bing, Yandex, Seznam, and Naver.",
    );
    return;
  }

  // Initial run shortly after boot so a freshly-deployed post does not have
  // to wait up to 24 hours. Delay slightly so the API server has time to
  // become responsive before we hit the DB.
  setTimeout(() => {
    void runIndexNowDaily();
  }, 30_000);

  // Then every 24 hours.
  setInterval(() => {
    void runIndexNowDaily();
  }, ONE_DAY_MS);

  JOB_LOG.info("Scheduled daily IndexNow sync (initial run in 30s, then every 24h)");
}
