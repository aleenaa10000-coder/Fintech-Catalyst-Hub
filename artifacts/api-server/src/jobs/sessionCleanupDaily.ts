import { lt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const JOB_LOG = logger.child({ job: "session-cleanup-daily" });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 5 * 60 * 1000;

/**
 * Daily sweep: hard-delete every session row whose `expire` timestamp is in
 * the past. `getSession()` already removes individual expired rows on access,
 * but sessions that are never accessed (e.g. from abandoned browsers) would
 * otherwise accumulate indefinitely. This job keeps the table lean.
 *
 * Runs once at startup after a 5-minute warm-up delay (to avoid competing
 * with the initial DB migration on first boot), then every 24 hours.
 */
export async function runSessionCleanup(): Promise<void> {
  const now = new Date();
  let count: { rowsAffected: number } | undefined;
  try {
    const result = await db
      .delete(sessionsTable)
      .where(lt(sessionsTable.expire, now))
      .returning({ sid: sessionsTable.sid });
    count = { rowsAffected: result.length };
  } catch (err) {
    JOB_LOG.error({ err }, "session-cleanup sweep failed; will retry tomorrow");
    return;
  }

  if (count.rowsAffected === 0) {
    JOB_LOG.debug("No expired sessions to purge");
    return;
  }

  JOB_LOG.info(
    { purged: count.rowsAffected },
    "Purged expired sessions from DB",
  );
}

let scheduled = false;

export function scheduleSessionCleanupDaily(): void {
  if (scheduled) return;
  scheduled = true;

  setTimeout(() => {
    void runSessionCleanup().catch((err) =>
      JOB_LOG.error({ err }, "session-cleanup: unexpected error in initial run"),
    );
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    void runSessionCleanup().catch((err) =>
      JOB_LOG.error({ err }, "session-cleanup: unexpected error in interval run"),
    );
  }, ONE_DAY_MS);

  JOB_LOG.info(
    "Scheduled daily session cleanup (initial run in 5 min, then every 24 h)",
  );
}
