import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const toolRatingsTable = pgTable("tool_ratings", {
  id: serial("id").primaryKey(),
  toolSlug: text("tool_slug").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ToolRatingRow = typeof toolRatingsTable.$inferSelect;
