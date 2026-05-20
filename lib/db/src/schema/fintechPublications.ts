import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const fintechPublicationsTable = pgTable(
  "fintech_publications",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    dr: integer("dr").notNull().default(0),
    tier: integer("tier").notNull().default(2),
    focus: text("focus").notNull().default(""),
    region: text("region").notNull().default("Global"),
    guestPosts: boolean("guest_posts").notNull().default(false),
    notes: text("notes").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("fintech_publications_tier_idx").on(t.tier),
    index("fintech_publications_sort_order_idx").on(t.sortOrder),
  ],
);

export type FintechPublicationRow = typeof fintechPublicationsTable.$inferSelect;
