import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { db, blogPostsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { ListBlogPostsQueryParams, GetBlogPostParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { isAdminEmail } from "../lib/auth";
import {
  getSiteUrl,
  notifySearchEnginesOfPublishWithTimeout,
  type SeoNotificationResult,
} from "../lib/seo";

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

const PublishBlogPostBody = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase, hyphenated"),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  author: z.string().min(1),
  authorRole: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().url(),
  readingMinutes: z.number().int().positive(),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
});

const UpdateBlogPostBody = z
  .object({
    title: z.string().min(1).optional(),
    excerpt: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    authorRole: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    coverImage: z.string().url().optional(),
    readingMinutes: z.number().int().positive().optional(),
    featured: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field is required",
  });

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
  const params = ListBlogPostsQueryParams.parse({
    category: req.query.category,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(params.category ? eq(blogPostsTable.category, params.category) : undefined)
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(params.limit ?? 50);

  res.json(rows.map(serialize));
});

router.get("/blog/featured", async (_req, res) => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.featured, true))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(6);
  res.json(rows.map(serialize));
});

router.get("/blog/categories", async (_req, res) => {
  const rows = await db
    .select({
      name: blogPostsTable.category,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(blogPostsTable)
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
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serialize(row));
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

    const [row] = await db
      .update(blogPostsTable)
      .set(body)
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
