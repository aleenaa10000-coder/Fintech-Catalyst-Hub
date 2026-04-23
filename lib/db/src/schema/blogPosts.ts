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
});

export type BlogPostRow = typeof blogPostsTable.$inferSelect;
