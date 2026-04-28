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
  // Lifetime view count, incremented by the public-facing post detail page
  // on mount via POST /api/blog/posts/:slug/view. Used to power the
  // "Most read" sort option on the blog index. Defaults to 0 for both
  // existing rows (DB default) and newly inserted rows (insert default).
  viewCount: integer("view_count").notNull().default(0),
  // Per-post SEO meta overrides — when set, these win over the auto-derived
  // title/description/OG image. Used by the admin to hand-tune how each post
  // appears in Google SERPs, LinkedIn cards, and X cards. All three are
  // independently overridable; null = "use the default derived from title/
  // excerpt/coverImage".
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoOgImage: text("seo_og_image"),
  // When true, the public post detail page emits
  // `<meta name="robots" content="noindex,nofollow">` so this post is
  // excluded from search engines (still publicly accessible by URL).
  // Useful for sponsored posts that legally require non-indexing,
  // outdated articles being phased out, or work-in-progress drafts the
  // admin wants visible for stakeholder review.
  noIndex: boolean("no_index").notNull().default(false),
  // Optional auto-unsnooze timestamp. When set together with
  // `noIndex = true`, an hourly background job (noindexExpiryHourly)
  // flips `noIndex` back to `false` and clears this column once
  // `now() >= noindexUntil`. Lets the admin temporarily hide a post
  // (e.g. while fixing thin content) without remembering to re-expose
  // it later. `null` means "no scheduled flip; manual control only".
  noindexUntil: timestamp("noindex_until", { withTimezone: true }),
});

export type BlogPostRow = typeof blogPostsTable.$inferSelect;
