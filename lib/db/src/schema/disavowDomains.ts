import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const disavowDomainsTable = pgTable("disavow_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  reason: text("reason"),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DisavowDomainRow = typeof disavowDomainsTable.$inferSelect;
