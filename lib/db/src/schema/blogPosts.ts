import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  authorRole: text("author_role").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  coverImage: text("cover_image").notNull(),
  readingMinutes: integer("reading_minutes").notNull(),
  featured: boolean("featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  // Auto-bumped to NOW() on every UPDATE via Drizzle's `$onUpdate` hook. New
  // rows default to the same instant as `publishedAt` so the public blog can
  // tell "never edited" from "edited later" by comparing the two values.
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // Last successful IndexNow ping for this post. Set whenever the
  // publish/update endpoints get an "accepted" response from IndexNow,
  // so the admin posts list can show a per-row "indexed N minutes ago"
  // badge and surface stale posts that need a manual re-ping.
  lastSeoPingAt: timestamp("last_seo_ping_at", { withTimezone: true }),
  lastSeoPingStatus: text("last_seo_ping_status"),
});

export type BlogPostRow = typeof blogPostsTable.$inferSelect;
