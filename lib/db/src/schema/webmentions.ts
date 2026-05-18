import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const webmentionsTable = pgTable(
  "webmentions",
  {
    id: serial("id").primaryKey(),
    sourceUrl: text("source_url").notNull(),
    targetUrl: text("target_url").notNull(),
    targetPath: text("target_path").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("webmentions_target_path_idx").on(t.targetPath),
    index("webmentions_received_at_idx").on(t.receivedAt),
  ],
);

export type WebmentionRow = typeof webmentionsTable.$inferSelect;
