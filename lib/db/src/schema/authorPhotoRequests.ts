import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const authorPhotoRequestsTable = pgTable(
  "author_photo_requests",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    photoUrl: text("photo_url").notNull(),
    submitterName: text("submitter_name"),
    submitterEmail: text("submitter_email"),
    note: text("note"),
    status: text("status", {
      enum: ["pending", "approved", "dismissed"],
    })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [
    index("author_photo_requests_status_idx").on(t.status),
    index("author_photo_requests_slug_idx").on(t.slug),
  ],
);

export type AuthorPhotoRequest = typeof authorPhotoRequestsTable.$inferSelect;
export type NewAuthorPhotoRequest =
  typeof authorPhotoRequestsTable.$inferInsert;
