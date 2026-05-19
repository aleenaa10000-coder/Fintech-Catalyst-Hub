import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const pressMentionsTable = pgTable("press_mentions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  publication: text("publication").notNull(),
  url: text("url").notNull(),
  year: text("year").notNull(),
  excerpt: text("excerpt"),
  logoUrl: text("logo_url"),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
