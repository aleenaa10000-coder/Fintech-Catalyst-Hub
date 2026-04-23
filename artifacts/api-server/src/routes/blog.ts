import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { ListBlogPostsQueryParams, GetBlogPostParams } from "@workspace/api-zod";

const router: IRouter = Router();

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
  };
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

export default router;
