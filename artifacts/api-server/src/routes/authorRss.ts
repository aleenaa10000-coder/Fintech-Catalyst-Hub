import { Router, type IRouter, type Request, type Response } from "express";
import { db, blogPostsTable, authorsTable } from "@workspace/db";
import { asc, desc, eq, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { escapeXml, RSS_SITE_DESCRIPTION } from "../lib/seoConstants";

const router: IRouter = Router();

const SITE_DESCRIPTION = RSS_SITE_DESCRIPTION;

function cdata(value: string): string {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

type FeedItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  content?: string;
  coverImage?: string | null;
};

async function collectAuthorPosts(authorSlug: string): Promise<FeedItem[]> {
  const [author] = await db
    .select({ name: authorsTable.name })
    .from(authorsTable)
    .where(eq(authorsTable.slug, authorSlug))
    .limit(1);

  if (!author) return [];

  const apiRows = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      excerpt: blogPostsTable.excerpt,
      category: blogPostsTable.category,
      author: blogPostsTable.author,
      publishedAt: blogPostsTable.publishedAt,
      content: blogPostsTable.content,
      noIndex: blogPostsTable.noIndex,
      coverImage: blogPostsTable.coverImage,
    })
    .from(blogPostsTable)
    .where(lte(blogPostsTable.publishedAt, sql`now()`))
    .orderBy(desc(blogPostsTable.publishedAt));

  return apiRows
    .filter((p) => {
      if (p.noIndex) return false;
      const nameSlug = p.author
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      return nameSlug === authorSlug;
    })
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.publishedAt.toISOString(),
      content: p.content,
      coverImage: p.coverImage,
    }));
}

function buildRss(opts: {
  siteUrl: string;
  selfUrl: string;
  channelTitle: string;
  channelLink: string;
  channelDescription: string;
  authorName: string;
  items: FeedItem[];
}): string {
  const lastBuildDate = new Date().toUTCString();
  const items = opts.items
    .map((p) => {
      const url = `${opts.siteUrl}/blog/${p.slug}`;
      const pubDate = new Date(p.date).toUTCString();
      const mediaUrl = p.coverImage
        ? (p.coverImage.startsWith("http") ? p.coverImage : `${opts.siteUrl}${p.coverImage.startsWith("/") ? "" : "/"}${p.coverImage}`)
        : `${opts.siteUrl}/api/og?title=${encodeURIComponent(p.title)}&type=blog`;
      return (
        `    <item>\n` +
        `      <title>${cdata(p.title)}</title>\n` +
        `      <link>${escapeXml(url)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        `      <dc:creator>${cdata(opts.authorName)}</dc:creator>\n` +
        (p.category
          ? `      <category>${cdata(p.category)}</category>\n`
          : "") +
        (p.excerpt
          ? `      <description>${cdata(p.excerpt)}</description>\n`
          : "") +
        (p.content
          ? `      <content:encoded>${cdata(p.content)}</content:encoded>\n`
          : "") +
        `      <media:content url="${escapeXml(mediaUrl)}" medium="image" />\n` +
        `    </item>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"\n` +
    `  xmlns:content="http://purl.org/rss/1.0/modules/content/"\n` +
    `  xmlns:dc="http://purl.org/dc/elements/1.1/"\n` +
    `  xmlns:atom="http://www.w3.org/2005/Atom"\n` +
    `  xmlns:media="http://search.yahoo.com/mrss/">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml(opts.channelTitle)}</title>\n` +
    `    <link>${escapeXml(opts.channelLink)}</link>\n` +
    `    <description>${escapeXml(opts.channelDescription)}</description>\n` +
    `    <language>en-us</language>\n` +
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
    `    <atom:link href="${escapeXml(opts.selfUrl)}" rel="self" type="application/rss+xml" />\n` +
    (items ? `${items}\n` : "") +
    `  </channel>\n` +
    `</rss>\n`
  );
}

async function handleAuthorRss(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug ?? "").toLowerCase();

  const [author] = await db
    .select({
      slug:     authorsTable.slug,
      name:     authorsTable.name,
      role:     authorsTable.role,
      shortBio: authorsTable.shortBio,
    })
    .from(authorsTable)
    .where(eq(authorsTable.slug, slug))
    .limit(1);

  if (!author) {
    res.status(404).type("text/plain").send("Author not found");
    return;
  }

  const siteUrl = getSiteUrl();
  const selfUrl = `${siteUrl}/authors/${author.slug}/rss.xml`;
  const items = await collectAuthorPosts(author.slug);

  const channelDescription = `Latest articles by ${author.name}, ${author.role} at FintechPressHub. ${author.shortBio} ${SITE_DESCRIPTION}`.trim();

  const xml = buildRss({
    siteUrl,
    selfUrl,
    channelTitle: `${author.name} on FintechPressHub`,
    channelLink: `${siteUrl}/authors/${author.slug}`,
    channelDescription,
    authorName: author.name,
    items,
  });

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
}

router.get("/authors/:slug/rss.xml", handleAuthorRss);

/**
 * Returns all known author slugs from the DB for use in sitemap generation.
 * Queries the DB at call time — call once at sitemap build, not per-request.
 */
export async function getKnownAuthorSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: authorsTable.slug })
    .from(authorsTable)
    .orderBy(asc(authorsTable.slug));
  return rows.map((r) => r.slug);
}

void asc;

export default router;
