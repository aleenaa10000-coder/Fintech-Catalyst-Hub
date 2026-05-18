import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export type PostAuditAction = "published" | "updated" | "deleted" | "unpublished" | "scheduled";

export interface PostAuditChangedFields {
  title?: [string, string];
  status?: [string, string];
  category?: [string, string];
  noIndex?: [boolean, boolean];
  publishedAt?: [string | null, string | null];
  [key: string]: unknown;
}

export const postAuditLogTable = pgTable(
  "post_audit_log",
  {
    id: serial("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    postId: text("post_id").notNull(),
    postSlug: text("post_slug").notNull(),
    postTitle: text("post_title").notNull(),
    changedFields: jsonb("changed_fields")
      .$type<PostAuditChangedFields>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("post_audit_log_created_at_idx").on(t.createdAt),
    postIdIdx: index("post_audit_log_post_id_idx").on(t.postId),
    actorIdx: index("post_audit_log_actor_idx").on(t.actorEmail),
  }),
);

export type PostAuditLogRow = typeof postAuditLogTable.$inferSelect;
