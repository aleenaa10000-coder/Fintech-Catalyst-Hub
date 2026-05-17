import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  db,
  blogPostsTable,
  bulkNoIndexAuditLogTable,
  kvStoreTable,
} from "@workspace/db";
import type { BulkNoIndexAuditPostSnapshot } from "@workspace/db";
import { eq, desc, asc, sql, inArray, and, lte, gt, type SQL } from "drizzle-orm";
import { ListBlogPostsQueryParams, GetBlogPostParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { isAdminEmail } from "../lib/auth";
import {
  getSiteUrl,
  notifySearchEnginesOfPublishWithTimeout,
  type SeoNotificationResult,
} from "../lib/seo";
import { invalidateSitemapCache } from "./sitemapIndex";

// Bound on how long the publish/update response will wait for the
// IndexNow ping before returning a "still in progress" placeholder.
// 4s is well under typical browser timeouts but enough for a healthy
// IndexNow round-trip (which usually completes in <500ms).
const SEO_NOTIFY_TIMEOUT_MS = 4000;

/**
 * Gate write endpoints behind the ADMIN_EMAILS allowlist. Returns 401 when
 * the request has no session and 403 when the signed-in user isn't on the
 * allowlist — distinct so the client can show "log in" vs. "not authorized".
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

const router: IRouter = Router();

// SEO override fields are nullable on the wire so the admin UI can
// explicitly clear an existing override (null/empty string -> fall back
// to the post's title/excerpt/coverImage). We accept "" as a synonym for
// null on the way in to keep the form code in admin-blog.tsx simple.
const seoTitleField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return v;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  });
const seoDescriptionField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return v;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine(
    (v) => v == null || (v.length >= 50 && v.length <= 160),
    {
      message:
        "seoDescription must be between 50 and 160 characters when provided",
    },
  );
const seoOgImageField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return v;
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine(
    (v) => {
      if (v == null) return true;
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "seoOgImage must be a valid absolute URL" },
  );

/** Strip HTML tags and count whitespace-separated tokens. */
function htmlWordCount(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0).length;
}

const CONTENT_MIN_WORDS = 800;
const CONTENT_MAX_WORDS = 3000;

const contentField = z
  .string()
  .min(1)
  .refine(
    (v) => htmlWordCount(v) >= CONTENT_MIN_WORDS,
    (v) => ({
      message: `Content must be at least ${CONTENT_MIN_WORDS} words (currently ${htmlWordCount(v)})`,
    }),
  )
  .refine(
    (v) => htmlWordCount(v) <= CONTENT_MAX_WORDS,
    (v) => ({
      message: `Content must be at most ${CONTENT_MAX_WORDS} words (currently ${htmlWordCount(v)})`,
    }),
  );

const PublishBlogPostBody = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: contentField,
  author: z.string().min(1),
  authorRole: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().url(),
  readingMinutes: z.number().int().positive(),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  seoTitle: seoTitleField,
  seoDescription: seoDescriptionField,
  seoOgImage: seoOgImageField,
  noIndex: z.boolean().optional(),
  faqItems: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .nullable()
    .optional(),
  blufSummary: z.string().nullable().optional(),
  lastMaterialUpdateAt: z.string().datetime().nullable().optional(),
  aboutEntities: z.array(z.string()).nullable().optional(),
  mentionEntities: z.array(z.string()).nullable().optional(),
  inlineImage1: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
  inlineImage2: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
  claimReviewClaim: z.string().nullable().optional(),
  claimReviewRating: z.string().nullable().optional(),
  claimReviewUrl: z.string().nullable().optional(),
});

const BulkNoIndexBody = z.object({
  slugs: z.array(z.string().min(1)).min(1).max(500),
  noIndex: z.boolean(),
  // Optional auto-unsnooze window. Only meaningful when `noIndex=true`:
  // a future `noindex_until` is computed as `now + snoozeDays * 24h`,
  // and the hourly background job will flip the post back to indexed
  // once that timestamp passes. When `noIndex=false`, `noindex_until`
  // is always cleared regardless of this value (re-indexing cancels
  // any pending snooze). Capped at 365 days so a typo cannot effectively
  // permanently de-index a post by accident.
  snoozeDays: z.number().int().positive().max(365).optional(),
});

const BulkRescheduleBody = z.object({
  posts: z
    .array(
      z.object({
        slug: z.string().min(1),
        publishedAt: z.string().datetime(),
      }),
    )
    .min(1)
    .max(100),
});

const UpdateBlogPostBody = z
  .object({
    title: z.string().min(1).optional(),
    excerpt: z.string().min(1).optional(),
    content: contentField.optional(),
    author: z.string().min(1).optional(),
    authorRole: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    coverImage: z.string().url().optional(),
    readingMinutes: z.number().int().positive().optional(),
    featured: z.boolean().optional(),
    // Reschedule the post. A future timestamp puts the post into
    // "scheduled" state — public reads filter it out until that moment
    // passes (no background job needed).
    publishedAt: z.string().datetime().optional(),
    seoTitle: seoTitleField,
    seoDescription: seoDescriptionField,
    seoOgImage: seoOgImageField,
    noIndex: z.boolean().optional(),
    faqItems: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .nullable()
      .optional(),
    blufSummary: z.string().nullable().optional(),
    lastMaterialUpdateAt: z.string().datetime().nullable().optional(),
    aboutEntities: z.array(z.string()).nullable().optional(),
    mentionEntities: z.array(z.string()).nullable().optional(),
    inlineImage1: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    inlineImage2: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v == null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    claimReviewClaim: z.string().nullable().optional(),
    claimReviewRating: z.string().nullable().optional(),
    claimReviewUrl: z.string().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field is required",
  });

/**
 * Predicate that hides scheduled posts (publishedAt > now()) from public
 * reads. The DB clock — not the Node process clock — is the source of
 * truth so a future-dated post flips to "published" the moment the SQL
 * `now()` advances past it, with no cron or background job required.
 *
 * The optional `asOf` argument is used by the admin "preview as scheduled
 * visitor" toggle: it shifts the visibility cutoff to a chosen future
 * moment so the admin sees exactly the list a public visitor will see on
 * that date. Callers MUST gate this on an admin check before forwarding
 * `asOf` from a request — `visibleToPublic` itself trusts whatever it's
 * given, since it has no view of the session.
 */
const visibleToPublic = (asOf?: Date): SQL =>
  asOf
    ? lte(blogPostsTable.publishedAt, asOf)
    : lte(blogPostsTable.publishedAt, sql`now()`);

function serialize(row: typeof blogPostsTable.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    author: row.author,
    authorRole: row.authorRole,
    category: row.category,
    tags: row.tags ?? [],
    coverImage: row.coverImage,
    readingMinutes: row.readingMinutes,
    featured: row.featured,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastSeoPingAt: row.lastSeoPingAt ? row.lastSeoPingAt.toISOString() : null,
    lastSeoPingStatus: row.lastSeoPingStatus ?? null,
    viewCount: row.viewCount,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    seoOgImage: row.seoOgImage ?? null,
    noIndex: row.noIndex,
    noindexUntil: row.noindexUntil ? row.noindexUntil.toISOString() : null,
    faqItems: row.faqItems ?? null,
    blufSummary: row.blufSummary ?? null,
    lastMaterialUpdateAt: row.lastMaterialUpdateAt
      ? row.lastMaterialUpdateAt.toISOString()
      : null,
    aboutEntities: row.aboutEntities ?? null,
    mentionEntities: row.mentionEntities ?? null,
    wordCount: row.wordCount ?? 0,
    inlineImage1: row.inlineImage1 ?? null,
    inlineImage2: row.inlineImage2 ?? null,
    claimReviewClaim: row.claimReviewClaim ?? null,
    claimReviewRating: row.claimReviewRating ?? null,
    claimReviewUrl: row.claimReviewUrl ?? null,
  };
}

/**
 * Persist the IndexNow ping outcome on the blog post row so the admin
 * UI can show a per-post "indexed N ago" badge. Fire-and-forget — a
 * write failure here is non-fatal; we just log and move on.
 */
async function recordSeoPing(
  slug: string,
  notification: SeoNotificationResult,
): Promise<typeof blogPostsTable.$inferSelect | null> {
  const status = notification.indexNow.status;
  const set: Partial<typeof blogPostsTable.$inferInsert> = {
    lastSeoPingStatus: status,
  };
  // Only bump the timestamp on a real successful ping. Failures and
  // skipped runs still update the status string so the admin can see
  // *why* the badge shows "never indexed".
  if (status === "accepted") {
    set.lastSeoPingAt = new Date();
  }
  try {
    const [row] = await db
      .update(blogPostsTable)
      .set(set)
      .where(eq(blogPostsTable.slug, slug))
      .returning();
    return row ?? null;
  } catch (err) {
    logger.error({ err, slug }, "Failed to persist SEO ping outcome");
    return null;
  }
}

function serializeWithSeo(
  row: typeof blogPostsTable.$inferSelect,
  seoNotification: SeoNotificationResult,
) {
  return { ...serialize(row), seoNotification };
}

router.get("/blog/posts", async (req, res) => {
  // `asOf` arrives as a string on the wire but the generated zod schema
  // expects a Date (orval doesn't coerce dates from query params), so we
  // hand-parse here before handing it to the schema. An invalid timestamp
  // is treated as "not provided" rather than a 400 — a stale bookmark
  // shouldn't break the page.
  const rawAsOf =
    typeof req.query.asOf === "string" ? req.query.asOf : undefined;
  const asOfCandidate = rawAsOf ? new Date(rawAsOf) : undefined;
  const params = ListBlogPostsQueryParams.parse({
    category: req.query.category,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    asOf:
      asOfCandidate && Number.isFinite(asOfCandidate.getTime())
        ? asOfCandidate
        : undefined,
  });

  // The "preview as scheduled visitor" admin toggle pipes a future
  // timestamp through `asOf` so the response matches what the public
  // will see on that date. We only honor it for admin sessions —
  // anyone else gets the standard `now()` cutoff so a curious visitor
  // can't probe scheduled URLs by guessing dates. We *silently drop*
  // the parameter for non-admins (rather than 400) to keep cache
  // behaviour predictable and to match the OpenAPI contract.
  let asOfDate: Date | undefined;
  if (params.asOf) {
    const isAdmin =
      req.isAuthenticated() && isAdminEmail(req.user.email);
    if (isAdmin) {
      asOfDate = params.asOf;
    }
  }

  // Hide scheduled (future-dated) posts from the public listing — they
  // appear automatically once the DB clock passes their publishedAt
  // (or the admin's `asOf` cutoff, when previewing).
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(
      params.category
        ? and(
            eq(blogPostsTable.category, params.category),
            visibleToPublic(asOfDate),
          )
        : visibleToPublic(asOfDate),
    )
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(params.limit ?? 50);

  // Prevent browser and proxy caching so admins always see the latest
  // view counts immediately after a post is visited — no stale cache
  // to bust manually.
  res.set("Cache-Control", "no-store");
  res.json(rows.map(serialize));
});

router.get("/blog/featured", async (_req, res) => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.featured, true), visibleToPublic()))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(6);
  res.json(rows.map(serialize));
});

router.get("/blog/tags", async (_req, res) => {
  // Return distinct tags with post counts — only from visible, non-noindex posts.
  // Uses a raw SQL unnest because Drizzle ORM doesn't expose
  // jsonb_array_elements_text natively, and a subquery approach over
  // JSONB is simpler and faster than application-level flattening at scale.
  const rows = await db.execute<{ tag: string; count: string }>(
    sql`
      SELECT
        tag,
        cast(count(*) as int) as count
      FROM (
        SELECT jsonb_array_elements_text(tags) as tag
        FROM blog_posts
        WHERE published_at <= now()
          AND no_index = false
      ) t
      WHERE tag IS NOT NULL AND tag <> ''
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `,
  );
  res.set("Cache-Control", "no-store");
  res.json(rows.rows.map((r) => ({ tag: r.tag, count: Number(r.count) })));
});

router.get("/blog/categories", async (_req, res) => {
  // Category counts only count *visible* posts so a category that only
  // contains scheduled posts doesn't appear in the public facets list.
  const rows = await db
    .select({
      name: blogPostsTable.category,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(blogPostsTable)
    .where(visibleToPublic())
    .groupBy(blogPostsTable.category)
    .orderBy(desc(sql`count(*)`));
  res.json(rows);
});

router.get("/blog/posts/:slug", async (req, res) => {
  const params = GetBlogPostParams.parse({ slug: req.params.slug });
  const [row] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.slug, params.slug))
    .limit(1);
  if (!row) {
    // Return 410 Gone for permanently deleted slugs so crawlers de-index
    // the URL faster than a plain 404 would. The tombstone is written to
    // kv_store by the DELETE /blog/posts/:slug handler.
    const [tombstone] = await db
      .select({ key: kvStoreTable.key })
      .from(kvStoreTable)
      .where(eq(kvStoreTable.key, `deleted_blog_slug:${params.slug}`))
      .limit(1);
    if (tombstone) {
      res.status(410).json({ error: "Gone — this post has been permanently deleted" });
      return;
    }
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Scheduled posts are 404 to anonymous visitors but visible to admins
  // so they can preview the live post URL before launch.
  if (row.publishedAt.getTime() > Date.now()) {
    const isAdmin =
      req.isAuthenticated() && isAdminEmail(req.user.email);
    if (!isAdmin) {
      res.status(404).json({ error: "Not found" });
      return;
    }
  }
  res.json(serialize(row));
});

/**
 * Atomically increment the lifetime view counter for a post. Pinged
 * from the public-facing post detail page on mount. Unauthenticated by
 * design — anyone visiting a post registers a view.
 *
 * Uses a single UPDATE ... RETURNING so we never have to read-modify-write
 * (which would race under concurrent loads).
 */
router.post("/blog/posts/:slug/view", async (req, res) => {
  const params = GetBlogPostParams.parse({ slug: req.params.slug });
  // Only count views once a post is publicly visible — scheduled posts
  // shouldn't accumulate "phantom" views from admin preview hits.
  const [row] = await db
    .update(blogPostsTable)
    .set({ viewCount: sql`${blogPostsTable.viewCount} + 1` })
    .where(and(eq(blogPostsTable.slug, params.slug), visibleToPublic()))
    .returning({ slug: blogPostsTable.slug, viewCount: blogPostsTable.viewCount });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ slug: row.slug, viewCount: row.viewCount });
});

/**
 * Publish a new blog post. Requires an authenticated session.
 *
 * On success this fires the publish hook: the new post appears in the
 * dynamic /sitemap.xml on the next request (always fresh from the DB), and
 * we issue background pings to IndexNow (Bing/Yandex/Seznam/Naver) and
 * Google so they can re-crawl quickly.
 */
router.post("/blog/posts", requireAdmin, async (req, res, next) => {
  try {
    const body = PublishBlogPostBody.parse(req.body);

    const [row] = await db
      .insert(blogPostsTable)
      .values({
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        author: body.author,
        authorRole: body.authorRole,
        category: body.category,
        tags: body.tags,
        coverImage: body.coverImage,
        readingMinutes: body.readingMinutes,
        featured: body.featured,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        wordCount: htmlWordCount(body.content),
        // SEO overrides — undefined leaves the column at the DB default
        // (null), null/empty-string explicitly clears it. The zod
        // transformer above already normalized "" → null.
        ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle } : {}),
        ...(body.seoDescription !== undefined
          ? { seoDescription: body.seoDescription }
          : {}),
        ...(body.seoOgImage !== undefined
          ? { seoOgImage: body.seoOgImage }
          : {}),
        ...(body.noIndex !== undefined ? { noIndex: body.noIndex } : {}),
        ...(body.faqItems !== undefined ? { faqItems: body.faqItems } : {}),
        ...(body.blufSummary !== undefined
          ? { blufSummary: body.blufSummary }
          : {}),
        ...(body.lastMaterialUpdateAt
          ? { lastMaterialUpdateAt: new Date(body.lastMaterialUpdateAt) }
          : {}),
        ...(body.aboutEntities !== undefined
          ? { aboutEntities: body.aboutEntities }
          : {}),
        ...(body.mentionEntities !== undefined
          ? { mentionEntities: body.mentionEntities }
          : {}),
        ...(body.inlineImage1 !== undefined
          ? { inlineImage1: body.inlineImage1 }
          : {}),
        ...(body.inlineImage2 !== undefined
          ? { inlineImage2: body.inlineImage2 }
          : {}),
        ...(body.claimReviewClaim !== undefined
          ? { claimReviewClaim: body.claimReviewClaim }
          : {}),
        ...(body.claimReviewRating !== undefined
          ? { claimReviewRating: body.claimReviewRating }
          : {}),
        ...(body.claimReviewUrl !== undefined
          ? { claimReviewUrl: body.claimReviewUrl }
          : {}),
      })
      .returning();

    if (!row) {
      res.status(500).json({ error: "Failed to insert blog post" });
      return;
    }

    // Publish hook: ping search engines and wait briefly so the admin
    // UI can show real success/failure feedback. The dynamic
    // /sitemap.xml route already reflects the new row.
    const siteUrl = getSiteUrl();
    const urls = [
      `${siteUrl}/blog/${row.slug}`,
      `${siteUrl}/blog`,
      `${siteUrl}/sitemap.xml`,
    ];
    let seoNotification: SeoNotificationResult;
    try {
      seoNotification = await notifySearchEnginesOfPublishWithTimeout(
        urls,
        SEO_NOTIFY_TIMEOUT_MS,
      );
    } catch (err) {
      logger.error({ err }, "Search-engine notification hook failed");
      seoNotification = {
        indexNow: {
          status: "error",
          message: `IndexNow ping threw: ${err instanceof Error ? err.message : String(err)}`,
          urlsSubmitted: 0,
        },
        google: {
          status: "error",
          message: "Google sitemap ping was not attempted because the IndexNow hook threw.",
        },
        urls,
        durationMs: 0,
      };
    }

    const updatedRow = await recordSeoPing(row.slug, seoNotification);

    // Flush the in-memory sitemap cache so Googlebot gets the updated
    // sitemap-blog.xml on its next crawl without waiting for the TTL.
    invalidateSitemapCache();

    // PR amplification: fire-and-forget webhook on immediate publishes.
    // Never blocks the admin response; failures are logged only.
    const prWebhookUrl = process.env["PR_WEBHOOK_URL"];
    const isImmediatePublish =
      !body.publishedAt ||
      new Date(body.publishedAt).getTime() <= Date.now();
    if (prWebhookUrl && isImmediatePublish) {
      fetch(prWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: row.title,
          url: `${siteUrl}/blog/${row.slug}`,
          author: row.author,
          excerpt: row.excerpt,
        }),
      }).catch((err) =>
        logger.warn({ err }, "PR amplification webhook delivery failed"),
      );
    }

    res.status(201).json(serializeWithSeo(updatedRow ?? row, seoNotification));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid body", issues: err.issues });
      return;
    }
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      res.status(409).json({ error: "A post with this slug already exists" });
      return;
    }
    next(err);
  }
});

/**
 * Update a blog post by slug. Requires an authenticated session.
 * Re-pings search engines so the updated URL is recrawled.
 */
router.patch("/blog/posts/:slug", requireAdmin, async (req, res, next) => {
  try {
    const { slug } = GetBlogPostParams.parse({ slug: req.params.slug });
    const body = UpdateBlogPostBody.parse(req.body);

    // Pass the validated body straight to drizzle. The zod transformer
    // already normalized empty SEO override strings to null, and
    // undefined fields stay omitted so partial updates don't accidentally
    // wipe other columns. publishedAt is the only field that needs to be
    // converted from its wire format (ISO string) to a Date for drizzle.
    const { publishedAt, lastMaterialUpdateAt, ...rest } = body;
    const updateValues: Partial<typeof blogPostsTable.$inferInsert> = { ...rest };
    if (publishedAt !== undefined) {
      updateValues.publishedAt = new Date(publishedAt);
    }
    // Recompute word count whenever content is updated so the stored value
    // and the BlogPosting JSON-LD wordCount field stay accurate.
    if (body.content !== undefined) {
      updateValues.wordCount = htmlWordCount(body.content);
    }
    if (lastMaterialUpdateAt !== undefined) {
      updateValues.lastMaterialUpdateAt = lastMaterialUpdateAt
        ? new Date(lastMaterialUpdateAt)
        : null;
    }
    const [row] = await db
      .update(blogPostsTable)
      .set(updateValues)
      .where(eq(blogPostsTable.slug, slug))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const siteUrl = getSiteUrl();
    const urls = [
      `${siteUrl}/blog/${row.slug}`,
      `${siteUrl}/blog`,
      `${siteUrl}/sitemap.xml`,
    ];
    let seoNotification: SeoNotificationResult;
    try {
      seoNotification = await notifySearchEnginesOfPublishWithTimeout(
        urls,
        SEO_NOTIFY_TIMEOUT_MS,
      );
    } catch (err) {
      logger.error({ err }, "Search-engine notification hook failed");
      seoNotification = {
        indexNow: {
          status: "error",
          message: `IndexNow ping threw: ${err instanceof Error ? err.message : String(err)}`,
          urlsSubmitted: 0,
        },
        google: {
          status: "error",
          message: "Google sitemap ping was not attempted because the IndexNow hook threw.",
        },
        urls,
        durationMs: 0,
      };
    }

    const updatedRow = await recordSeoPing(row.slug, seoNotification);

    // Flush the sitemap cache so Googlebot picks up the updated lastmod
    // on the next crawl rather than waiting for the 5-minute TTL.
    invalidateSitemapCache();

    res.json(serializeWithSeo(updatedRow ?? row, seoNotification));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid body", issues: err.issues });
      return;
    }
    next(err);
  }
});

/**
 * Bulk-set the `noIndex` flag on a batch of posts in a single transaction.
 * Used by the admin blog dashboard to hide a wad of older posts from search
 * engines (or to un-hide them) in one click. Pure DB write — does NOT
 * trigger an IndexNow ping (the goal is the opposite: tell crawlers these
 * URLs are no longer index targets via the meta robots tag on next crawl).
 */
router.post(
  "/admin/blog/posts/bulk-noindex",
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = BulkNoIndexBody.parse(req.body);
      const uniqueSlugs = Array.from(new Set(body.slugs));

      // Snooze semantics:
      //   - noIndex=true + snoozeDays=N → set noindex_until = now + N days
      //     (the hourly job will auto-flip back to indexed when the
      //     timestamp passes).
      //   - noIndex=true with no snoozeDays → indefinite hide; clear
      //     any prior pending snooze so a previously-snoozed post
      //     becomes a manually-managed hide.
      //   - noIndex=false → re-expose immediately and cancel any
      //     pending auto-unsnooze (clearing noindex_until).
      const updateValues: Partial<typeof blogPostsTable.$inferInsert> = {
        noIndex: body.noIndex,
      };
      if (body.noIndex && body.snoozeDays) {
        updateValues.noindexUntil = new Date(
          Date.now() + body.snoozeDays * 24 * 60 * 60 * 1000,
        );
      } else {
        updateValues.noindexUntil = null;
      }

      // Snapshot the targeted rows BEFORE the update so we can write a
      // faithful audit entry (view counts, prior noIndex flag, etc.). We
      // pull only the columns we need for the audit log + impact totals.
      const before = await db
        .select({
          slug: blogPostsTable.slug,
          title: blogPostsTable.title,
          category: blogPostsTable.category,
          viewCount: blogPostsTable.viewCount,
          featured: blogPostsTable.featured,
          publishedAt: blogPostsTable.publishedAt,
          noIndex: blogPostsTable.noIndex,
        })
        .from(blogPostsTable)
        .where(inArray(blogPostsTable.slug, uniqueSlugs));

      const updated = await db
        .update(blogPostsTable)
        .set(updateValues)
        .where(inArray(blogPostsTable.slug, uniqueSlugs))
        .returning();

      // Only the rows whose `noIndex` flag actually flipped count as
      // "impacted" — posts already in the target state get filtered out
      // so the audit log mirrors what the admin saw in the impact preview.
      const updatedSlugs = new Set(updated.map((p: { slug: string }) => p.slug));
      const impactedBefore = before.filter(
        (p: { slug: string; noIndex: boolean | null }) => updatedSlugs.has(p.slug) && p.noIndex !== body.noIndex,
      );

      let auditId: number | null = null;
      if (impactedBefore.length > 0) {
        const snapshot: BulkNoIndexAuditPostSnapshot[] = impactedBefore.map(
          (p: { slug: string; title: string; category: string; viewCount: number | null; featured: boolean | null; publishedAt: Date; noIndex: boolean | null }) => ({
            slug: p.slug,
            title: p.title,
            category: p.category,
            viewCount: p.viewCount ?? 0,
            featured: !!p.featured,
            publishedAt: p.publishedAt.toISOString(),
            wasNoIndex: !!p.noIndex,
          }),
        );
        const totalViewsHidden = snapshot.reduce(
          (sum, p) => sum + (p.viewCount ?? 0),
          0,
        );
        try {
          const [auditRow] = await db
            .insert(bulkNoIndexAuditLogTable)
            .values({
              actorEmail: req.user?.email ?? "unknown",
              actorUserId: req.user?.id ?? null,
              mode: body.noIndex ? "noindex" : "reindex",
              snoozeDays:
                body.noIndex && body.snoozeDays ? body.snoozeDays : null,
              requestedSlugCount: uniqueSlugs.length,
              updatedCount: snapshot.length,
              totalViewsHidden,
              posts: snapshot,
            })
            .returning({ id: bulkNoIndexAuditLogTable.id });
          auditId = auditRow?.id ?? null;
        } catch (auditErr) {
          // Audit write failures must not break the user-visible bulk
          // action — log loudly so we still notice, but return success.
          logger.error(
            { err: auditErr, slugCount: snapshot.length },
            "Failed to write bulk-noindex audit log row",
          );
        }
      }

      res.json({
        updatedCount: updated.length,
        noIndex: body.noIndex,
        posts: updated.map(serialize),
        auditId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid body", issues: err.issues });
        return;
      }
      next(err);
    }
  },
);

/**
 * Bulk-update the `publishedAt` timestamp on multiple posts in a single
 * database transaction. Used by the admin blog scheduling queue when the
 * admin drag-reorders multiple posts or applies a bulk time-shift operation.
 *
 * Body: { posts: Array<{ slug: string; publishedAt: string (ISO datetime) }> }
 * Response: { updatedCount: number; posts: PublishedBlogPost[] }
 *
 * Posts whose slug is not found in the DB are silently skipped (they are
 * static seed posts that haven't been published to the DB yet). The caller
 * can detect this by comparing `updatedCount` against the length of the
 * request array.
 */
router.post(
  "/admin/blog/posts/bulk-reschedule",
  requireAdmin,
  async (req, res, next) => {
    try {
      const body = BulkRescheduleBody.parse(req.body);

      const updated: (typeof blogPostsTable.$inferSelect)[] = [];

      await db.transaction(async (tx) => {
        for (const item of body.posts) {
          const [row] = await tx
            .update(blogPostsTable)
            .set({ publishedAt: new Date(item.publishedAt) })
            .where(eq(blogPostsTable.slug, item.slug))
            .returning();
          if (row) updated.push(row);
        }
      });

      res.json({
        updatedCount: updated.length,
        posts: updated.map(serialize),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid body", issues: err.issues });
        return;
      }
      next(err);
    }
  },
);

/**
 * Manually re-ping IndexNow + Google for a single existing post. Pinned
 * to the admin posts table so an admin can re-submit without making any
 * content changes (useful when the original publish missed because
 * `INDEXNOW_KEY` was unset, or when the SERP listing is stale).
 *
 * Mirrors the response shape of POST /blog/posts and PATCH /blog/posts/:slug
 * so the UI can reuse the same SEO notification toast.
 */
router.post(
  "/blog/posts/:slug/reping-indexnow",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { slug } = GetBlogPostParams.parse({ slug: req.params.slug });

      const [row] = await db
        .select()
        .from(blogPostsTable)
        .where(eq(blogPostsTable.slug, slug))
        .limit(1);

      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const siteUrl = getSiteUrl();
      const urls = [
        `${siteUrl}/blog/${row.slug}`,
        `${siteUrl}/blog`,
        `${siteUrl}/sitemap.xml`,
      ];
      let seoNotification: SeoNotificationResult;
      try {
        seoNotification = await notifySearchEnginesOfPublishWithTimeout(
          urls,
          SEO_NOTIFY_TIMEOUT_MS,
        );
      } catch (err) {
        logger.error({ err }, "Manual re-ping hook failed");
        seoNotification = {
          indexNow: {
            status: "error",
            message: `IndexNow ping threw: ${err instanceof Error ? err.message : String(err)}`,
            urlsSubmitted: 0,
          },
          google: {
            status: "error",
            message:
              "Google sitemap ping was not attempted because the IndexNow hook threw.",
          },
          urls,
          durationMs: 0,
        };
      }

      const updatedRow = await recordSeoPing(row.slug, seoNotification);
      res.json(serializeWithSeo(updatedRow ?? row, seoNotification));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid slug", issues: err.issues });
        return;
      }
      next(err);
    }
  },
);

/**
 * Admin-only: list all scheduled (future-dated) posts sorted by publishedAt
 * ascending so the nearest-to-publish post appears first. This is a separate
 * endpoint from GET /blog/posts because the public list intentionally hides
 * future-dated posts — here we invert the filter so admins get a clean queue
 * view without polluting the public API contract.
 */
router.get(
  "/admin/blog/posts/scheduled",
  requireAdmin,
  async (_req, res) => {
    const rows = await db
      .select()
      .from(blogPostsTable)
      .where(gt(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(asc(blogPostsTable.publishedAt));
    res.set("Cache-Control", "no-store");
    res.json(rows.map(serialize));
  },
);

/**
 * Topical Authority Score — computes a 0–100 score for the blog content graph.
 * Factors: unique published categories, unique published tags, average posts per
 * category. A higher score signals broader keyword coverage and deeper subject
 * matter expertise to Google's topic-authority algorithms.
 */
router.get(
  "/admin/blog/topical-authority",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const [categoryStats, tagStats] = await Promise.all([
        db.execute<{ category: string; post_count: string }>(sql`
          SELECT category, count(*)::text as post_count
          FROM blog_posts
          WHERE published_at <= now()
            AND no_index = false
            AND category IS NOT NULL
            AND category <> ''
          GROUP BY category
        `),
        db.execute<{ tag: string; post_count: string }>(sql`
          SELECT jsonb_array_elements_text(tags) as tag, count(*)::text as post_count
          FROM blog_posts
          WHERE published_at <= now()
            AND no_index = false
          GROUP BY tag
          HAVING jsonb_array_elements_text(tags) IS NOT NULL
            AND jsonb_array_elements_text(tags) <> ''
        `).catch(() => ({ rows: [] as Array<{ tag: string; post_count: string }> })),
      ]);

      const categories = categoryStats.rows;
      const tags = tagStats.rows;
      const totalPosts = categories.reduce((sum, r) => sum + parseInt(r.post_count, 10), 0);
      const uniqueCategories = categories.length;
      const uniqueTags = tags.length;
      const avgPostsPerCategory = uniqueCategories > 0 ? totalPosts / uniqueCategories : 0;

      // Score components (each 0–100, weighted):
      //   40% = category breadth (≥8 = full score, mirrors STATIC_CATEGORY_SLUGS count)
      //   30% = tag depth (≥100 unique tags = full score)
      //   30% = avg posts per category (≥10 = full score — signals depth not just breadth)
      const categoryScore = Math.min(uniqueCategories / 8, 1) * 40;
      const tagScore = Math.min(uniqueTags / 100, 1) * 30;
      const depthScore = Math.min(avgPostsPerCategory / 10, 1) * 30;
      const score = Math.round(categoryScore + tagScore + depthScore);

      const sortedCategories = [...categories].sort(
        (a, b) => parseInt(b.post_count, 10) - parseInt(a.post_count, 10),
      );
      // Categories with fewer than 5 posts are considered "thin" — they may
      // not have enough depth for Google to recognise topical authority in
      // that subject area. Surface them so editors can prioritise coverage.
      const THIN_THRESHOLD = 5;
      const thinCategories = sortedCategories
        .filter((r) => parseInt(r.post_count, 10) < THIN_THRESHOLD)
        .map((r) => ({ category: r.category, postCount: parseInt(r.post_count, 10) }));

      res.json({
        score,
        breakdown: {
          uniqueCategories,
          uniqueTags,
          totalPosts,
          avgPostsPerCategory: parseFloat(avgPostsPerCategory.toFixed(1)),
          categoryScore: parseFloat(categoryScore.toFixed(1)),
          tagScore: parseFloat(tagScore.toFixed(1)),
          depthScore: parseFloat(depthScore.toFixed(1)),
        },
        topCategories: sortedCategories
          .slice(0, 5)
          .map((r) => ({ category: r.category, postCount: parseInt(r.post_count, 10) })),
        thinCategories,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete (unpublish) a blog post by slug. Requires an authenticated session.
 * The deleted URL stays out of the next /sitemap.xml render automatically.
 */
router.delete("/blog/posts/:slug", requireAdmin, async (req, res, next) => {
  try {
    const { slug } = GetBlogPostParams.parse({ slug: req.params.slug });

    const [row] = await db
      .delete(blogPostsTable)
      .where(eq(blogPostsTable.slug, slug))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Notify search engines so the deleted URL is de-indexed promptly.
    // Fire-and-forget — the 204 response is not delayed by the ping.
    const siteUrl = getSiteUrl();
    notifySearchEnginesOfPublishWithTimeout(
      [
        `${siteUrl}/blog/${row.slug}`,
        `${siteUrl}/blog`,
        `${siteUrl}/sitemap.xml`,
      ],
      SEO_NOTIFY_TIMEOUT_MS,
    ).catch((err) =>
      logger.warn({ err }, "IndexNow de-index ping failed after blog post delete"),
    );

    // Write a kvStore tombstone so the public GET /blog/posts/:slug
    // endpoint returns 410 Gone instead of 404 for this deleted slug.
    // Fire-and-forget — a tombstone write failure is non-fatal.
    await db
      .insert(kvStoreTable)
      .values({
        key: `deleted_blog_slug:${row.slug}`,
        value: { deletedAt: new Date().toISOString(), title: row.title },
      })
      .onConflictDoUpdate({
        target: kvStoreTable.key,
        set: {
          value: { deletedAt: new Date().toISOString(), title: row.title },
          updatedAt: new Date(),
        },
      })
      .catch((err) =>
        logger.warn({ err, slug: row.slug }, "Failed to write blog post tombstone"),
      );

    invalidateSitemapCache();

    res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid slug", issues: err.issues });
      return;
    }
    next(err);
  }
});

export default router;
