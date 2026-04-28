import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export interface BulkNoIndexAuditPostSnapshot {
  slug: string;
  title: string;
  category: string;
  viewCount: number;
  featured: boolean;
  publishedAt: string;
  wasNoIndex: boolean;
}

export const bulkNoIndexAuditLogTable = pgTable(
  "bulk_noindex_audit_log",
  {
    id: serial("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    actorUserId: text("actor_user_id"),
    mode: text("mode").notNull(),
    snoozeDays: integer("snooze_days"),
    requestedSlugCount: integer("requested_slug_count").notNull(),
    updatedCount: integer("updated_count").notNull(),
    totalViewsHidden: integer("total_views_hidden").notNull().default(0),
    posts: jsonb("posts")
      .$type<BulkNoIndexAuditPostSnapshot[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("bulk_noindex_audit_created_at_idx").on(t.createdAt),
  }),
);

export type BulkNoIndexAuditRow = typeof bulkNoIndexAuditLogTable.$inferSelect;
