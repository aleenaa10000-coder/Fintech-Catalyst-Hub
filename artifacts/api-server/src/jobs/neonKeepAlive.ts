import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Neon free-tier keep-alive ping.
 *
 * Neon pauses inactive databases after 5 minutes of zero activity. When the
 * DB wakes up it adds ~500 ms of cold-start latency to the first request,
 * which is visible to real visitors as a slow page load.
 *
 * This job fires a `SELECT 1` every 4 minutes to keep the connection warm
 * without consuming meaningful compute. Only scheduled in production.
 *
 * If you're on a paid Neon plan (which disables auto-suspend), this is a
 * no-op and can be removed.
 */
export function scheduleNeonKeepAlive(): void {
  if (process.env.NODE_ENV !== "production") return;

  const INTERVAL_MS = 4 * 60 * 1000;

  setInterval(async () => {
    try {
      await db.execute(sql`select 1`);
      logger.debug("Neon keep-alive: DB ping OK");
    } catch (err) {
      logger.warn({ err }, "Neon keep-alive: DB ping failed — Neon may be pausing");
    }
  }, INTERVAL_MS);

  logger.info("Neon keep-alive scheduled (every 4 min) — prevents free-tier auto-suspend");
}
