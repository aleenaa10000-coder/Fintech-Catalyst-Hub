import {
  pgTable,
  serial,
  text,
  integer,
  real,
  date,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * One row per page per weekly Lighthouse run.
 * Written by scripts/lighthouse-store.mjs immediately after lhci collect.
 * Queried by scripts/lighthouse-email.mjs to generate the 8-week trend grid.
 *
 * run_date + page_url is unique so re-running the weekly job is idempotent
 * (ON CONFLICT DO UPDATE replaces the scores for that date).
 */
export const lighthouseScoresTable = pgTable(
  "lighthouse_scores",
  {
    id: serial("id").primaryKey(),
    /** ISO date string of the Monday the run was triggered (e.g. "2026-05-12"). */
    runDate: date("run_date").notNull(),
    /** Full URL that was audited (e.g. "http://localhost:4173/"). */
    pageUrl: text("page_url").notNull(),
    /** Lighthouse category scores (0–100). */
    performance:    integer("performance"),
    accessibility:  integer("accessibility"),
    bestPractices:  integer("best_practices"),
    seo:            integer("seo"),
    /** Core Web Vitals — LCP / TBT / FCP / TTI in milliseconds. */
    lcpMs:  integer("lcp_ms"),
    tbtMs:  integer("tbt_ms"),
    fcpMs:  integer("fcp_ms"),
    ttiMs:  integer("tti_ms"),
    /** CLS is a unitless ratio (e.g. 0.042). Stored as real. */
    cls:    real("cls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("lh_scores_date_url").on(t.runDate, t.pageUrl)],
);

export type LighthouseScoreRow = typeof lighthouseScoresTable.$inferSelect;
export type LighthouseScoreInsert = typeof lighthouseScoresTable.$inferInsert;
