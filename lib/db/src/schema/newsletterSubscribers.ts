import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const BRIEF_LEAD_STATUSES = ["new", "in_progress", "sent", "actioned"] as const;
export type BriefLeadStatus = typeof BRIEF_LEAD_STATUSES[number];

export const newsletterSubscribersTable = pgTable(
  "newsletter_subscribers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source"),
    keyword: text("keyword"),
    briefStatus: text("brief_status").$type<BriefLeadStatus>(),
    briefStatusUpdatedAt: timestamp("brief_status_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
  }),
);
