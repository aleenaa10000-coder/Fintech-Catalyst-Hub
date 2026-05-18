import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const toolRatingsTable = pgTable(
  "tool_ratings",
  {
    id: serial("id").primaryKey(),
    toolSlug: text("tool_slug").notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tool_ratings_tool_slug_idx").on(t.toolSlug),
  ],
);

export type ToolRatingRow = typeof toolRatingsTable.$inferSelect;
