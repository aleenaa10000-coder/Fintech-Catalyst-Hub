import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Lightweight key/value table for small bits of server state that don't
// warrant a dedicated schema (e.g. "last time the IndexNow daily job ran").
export const kvStoreTable = pgTable("kv_store", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type KvStoreRow = typeof kvStoreTable.$inferSelect;
