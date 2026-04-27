import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// Persistent state for the daily sitemap link-checker. One row per URL we
// monitor (deduplicated on `url`). Lets the job tell "this URL was OK
// yesterday and broke today" from "this URL has been broken for a week"
// so we only email admins on fresh OK→broken transitions, not every day.
export const linkCheckResultsTable = pgTable("link_check_results", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  // Where this URL came from on the most recent check. Lets the admin
  // dashboard segment results (e.g. "blog post" vs "static page" vs
  // "author profile" vs "RSS feed") without re-parsing the sitemap.
  source: text("source").notNull().default("sitemap"),
  // HTTP status from the most recent check. Null when the request never
  // completed (DNS failure, network timeout) — `lastError` carries the
  // diagnostic in that case.
  lastStatusCode: integer("last_status_code"),
  lastError: text("last_error"),
  // True when the most recent check returned 4xx/5xx OR the fetch threw.
  // Indexed implicitly via the unique `url` lookup; we never query by it.
  isBroken: boolean("is_broken").notNull().default(false),
  // First time this URL flipped to broken (cleared when it recovers). Lets
  // the admin dashboard show "Broken since 3 days ago" instead of just the
  // most recent check time.
  brokenSince: timestamp("broken_since", { withTimezone: true }),
  // Most recent successful (2xx/3xx) check. Used to age out URLs that have
  // been failing for too long and to power the "Last OK" column in the
  // admin sitemap-health table.
  lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  // Set when we send the OK→broken alert email so we don't spam admins on
  // every subsequent daily run for the same broken URL. Cleared when the
  // URL recovers, so a re-break re-arms the alert.
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});

export type LinkCheckResultRow = typeof linkCheckResultsTable.$inferSelect;
