import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const authorPhotoOverridesTable = pgTable("author_photo_overrides", {
  slug: text("slug").primaryKey(),
  photoUrl: text("photo_url").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuthorPhotoOverride = typeof authorPhotoOverridesTable.$inferSelect;
export type NewAuthorPhotoOverride =
  typeof authorPhotoOverridesTable.$inferInsert;
