import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const webmentionsTable = pgTable("webmentions", {
  id: serial("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  targetUrl: text("target_url").notNull(),
  targetPath: text("target_path").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WebmentionRow = typeof webmentionsTable.$inferSelect;
