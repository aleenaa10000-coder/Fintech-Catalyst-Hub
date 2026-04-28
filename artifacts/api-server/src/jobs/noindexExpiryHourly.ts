import { db, blogPostsTable } from "@workspace/db";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { logger } from "../lib/logger";

const JOB_LOG = logger.child({ job: "noindex-expiry-hourly" });

const ONE_HOUR_MS = 60 * 60 * 1000;
const INITIAL_DELAY_MS = 60_000;

/**
 * Hourly sweep: find every blog post that is currently no-indexed AND has
 * a `noindexUntil` timestamp in the past, then flip `noIndex` back to
 * `false` and clear `noindexUntil`. Powers the "Snooze no-index for N days"
 * admin action — the admin marks a post as temporarily hidden, sets a
 * future expiry, and this job ensures the post is re-exposed to search
 * engines automatically when the snooze window elapses.
 *
 * Idempotent — running it twice in the same hour does no harm because the
 * WHERE clause filters out rows that have already been re-exposed (they
 * no longer satisfy `no_index = true` or `noindex_until IS NOT NULL`).
 */
export async function runNoIndexExpiry(): Promise<void> {
  const now = new Date();
  let updated: { slug: string }[];
  try {
    updated = await db
      .update(blogPostsTable)
      .set({ noIndex: false, noindexUntil: null })
      .where(
        and(
          eq(blogPostsTable.noIndex, true),
          isNotNull(blogPostsTable.noindexUntil),
          lte(blogPostsTable.noindexUntil, now),
        ),
      )
      .returning({ slug: blogPostsTable.slug });
  } catch (err) {
    JOB_LOG.error({ err }, "noindex-expiry sweep failed; will retry next hour");
    return;
  }

  if (updated.length === 0) {
    JOB_LOG.debug("No expired no-index snoozes to clear");
    return;
  }

  JOB_LOG.info(
    { count: updated.length, slugs: updated.map((r) => r.slug) },
    "Auto-re-exposed posts whose no-index snooze window elapsed",
  );
}

let scheduled = false;

export function scheduleNoIndexExpiryHourly(): void {
  if (scheduled) return;
  scheduled = true;

  setTimeout(() => {
    void runNoIndexExpiry();
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runNoIndexExpiry();
  }, ONE_HOUR_MS);

  JOB_LOG.info(
    "Scheduled hourly no-index expiry sweep (initial run in 60s, then every 1h)",
  );
}
