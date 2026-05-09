import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// One row per unique referring domain observed linking to the site.
// `first_seen_at` is the date the domain was first discovered — either
// from a manual GSC export, an automated import job, or a future
// GSC API integration. This timestamp drives the Link Velocity chart
// on the admin SEO performance dashboard (new domains acquired per week).
export const referringDomainsTable = pgTable("referring_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  // When this domain was first observed linking to the site. Used to
  // bucket new domains into ISO calendar weeks for the velocity chart.
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Optional free-text label for where this referral came from — e.g.
  // "gsc_import", "manual", "ahrefs_export". Lets the admin audit the
  // provenance of domain entries without touching the chart logic.
  source: text("source").notNull().default("manual"),
});

export type ReferringDomainRow = typeof referringDomainsTable.$inferSelect;
