import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";

// Persistent state for the daily internal-page link checker. One row per
// (source_page, link_url) pair so we can answer both "which pages have
// broken links?" and "which URLs are linked-to but broken?" without a
// second query.
export const pageLinkResultsTable = pgTable("page_link_results", {
  id: serial("id").primaryKey(),
  // The page whose HTML was crawled (absolute URL).
  sourcePage: text("source_page").notNull(),
  // The internal URL that was found in an <a href> and then probed.
  linkUrl: text("link_url").notNull(),
  // HTTP status from the most-recent probe. Null on network error.
  lastStatusCode: integer("last_status_code"),
  // Error message when the fetch threw (timeout, DNS, etc.).
  lastError: text("last_error"),
  // True when the probe returned 4xx/5xx or the fetch threw.
  isBroken: boolean("is_broken").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [unique("page_link_results_source_link").on(t.sourcePage, t.linkUrl)]);

export type PageLinkResultRow = typeof pageLinkResultsTable.$inferSelect;
