import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, gte, lte, sql, and } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { escapeXml } from "../lib/seoConstants";

const router: IRouter = Router();

/**
 * Google News Sitemap — /news-sitemap.xml
 *
 * Includes blog posts published within the last 48 hours (the Google News
 * crawler typically only indexes articles submitted within this window).
 * Excludes noIndex posts.
 *
 * Ref: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */
async function buildNewsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const now = new Date();

  const posts = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      publishedAt: blogPostsTable.publishedAt,
      category: blogPostsTable.category,
      tags: blogPostsTable.tags,
      noIndex: blogPostsTable.noIndex,
    })
    .from(blogPostsTable)
    .where(
      and(
        gte(blogPostsTable.publishedAt, twoDaysAgo),
        lte(blogPostsTable.publishedAt, sql`now()`),
      ),
    )
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(1000);

  const indexable = posts.filter((p) => !p.noIndex);

  if (indexable.length === 0) {
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
      `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
      `</urlset>\n`
    );
  }

  const entries = indexable
    .map((p) => {
      const pubDate = p.publishedAt.toISOString();
      // news:keywords — comma-separated list of up to 10 tags. Helps Google News
      // classify articles into topic buckets (e.g. "open banking", "regtech") so
      // they surface for readers subscribing to those topics in Google News feeds.
      // Tags are capped at 10 to stay within Google's recommended keyword count.
      const tags = Array.isArray(p.tags) ? (p.tags as string[]).slice(0, 10) : [];
      const keywordsLine = tags.length > 0
        ? `      <news:keywords>${escapeXml(tags.join(", "))}</news:keywords>\n`
        : "";
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(`${siteUrl}/blog/${p.slug}`)}</loc>\n` +
        `    <news:news>\n` +
        `      <news:publication>\n` +
        `        <news:name>FintechPressHub</news:name>\n` +
        `        <news:language>en</news:language>\n` +
        `      </news:publication>\n` +
        `      <news:publication_date>${pubDate}</news:publication_date>\n` +
        `      <news:title>${escapeXml(p.title)}</news:title>\n` +
        `      <news:genres>Blog</news:genres>\n` +
        keywordsLine +
        `    </news:news>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
    entries + "\n" +
    `</urlset>\n`
  );
}

router.get("/news-sitemap.xml", async (_req, res) => {
  const xml = await buildNewsSitemapXml();
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // News sitemaps must be fresh — short cache, aggressive revalidation.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.send(xml);
});

export default router;
