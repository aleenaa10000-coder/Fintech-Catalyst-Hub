import { pgTable, serial, text, real, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Stores Core Web Vitals (CWV) measurements reported by the frontend
 * via POST /api/vitals. Used by the admin SEO performance dashboard to
 * show real-user LCP, CLS, and INP distributions over time.
 */
export const webVitalsTable = pgTable(
  "web_vitals",
  {
    id: serial("id").primaryKey(),
    /** Metric name: LCP | CLS | INP | FID | TTFB */
    name: text("name").notNull(),
    /** The metric value (milliseconds for LCP/INP/FID/TTFB, unitless for CLS). */
    value: real("value").notNull(),
    /** Google's rating bucket: "good" | "needs-improvement" | "poor" */
    rating: text("rating").notNull(),
    /** Delta since last report (useful for detecting regressions). */
    delta: real("delta"),
    /** URL pathname where the metric was captured (e.g. "/blog/my-post"). */
    page: text("page").notNull().default("/"),
    /** When the metric was reported. */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("web_vitals_created_at_idx").on(t.createdAt),
    index("web_vitals_name_created_at_idx").on(t.name, t.createdAt),
  ],
);

export type WebVitalRow = typeof webVitalsTable.$inferSelect;
export type NewWebVital = typeof webVitalsTable.$inferInsert;
