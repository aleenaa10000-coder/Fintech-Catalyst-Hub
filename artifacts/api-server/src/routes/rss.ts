import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { escapeXml, RSS_SITE_DESCRIPTION } from "../lib/seoConstants";
import staticPostsRaw from "../../../fintechpresshub/src/data/posts.js";

type StaticPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  content?: string;
};

const staticPosts = staticPostsRaw as StaticPost[];

const SITE_NAME = "FintechPressHub";
const SITE_DESCRIPTION = RSS_SITE_DESCRIPTION;

const router: IRouter = Router();

function cdata(value: string): string {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

type FeedItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  content?: string;
  coverImage?: string | null;
};

async function collectAllPosts(): Promise<FeedItem[]> {
  const fromStatic: FeedItem[] = staticPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author ?? "",
    date: p.date,
    content: p.content,
  }));

  // DB posts overlay static posts on slug collision (same rule used by
  // the public-facing usePublicPosts hook). Scheduled (future-dated) posts
  // are excluded so feed readers never see entries that return 404.
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

  const merged = new Map<string, FeedItem>();
  for (const p of fromStatic) merged.set(p.slug, p);
  for (const p of apiRows) {
    // Respect noIndex — search crawlers and feed readers shouldn't see
    // posts the admin has explicitly hidden from indexing.
    if (p.noIndex) {
      merged.delete(p.slug);
      continue;
    }
    merged.set(p.slug, {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      author: p.author,
      date: p.publishedAt.toISOString(),
      content: p.content,
      coverImage: p.coverImage,
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function buildRss(opts: {
  siteUrl: string;
  items: FeedItem[];
}): string {
  const selfUrl = `${opts.siteUrl}/rss.xml`;
  const lastBuildDate = new Date().toUTCString();

  const itemsXml = opts.items
    .map((p) => {
      const url = `${opts.siteUrl}/blog/${p.slug}`;
      const pubDate = new Date(p.date).toUTCString();
      // Use the stored cover image if present; fall back to the OG-image API.
      // Resolve relative paths to absolute URLs — RSS <media:content url> must be absolute.
      const mediaUrl = p.coverImage
        ? (p.coverImage.startsWith("http") ? p.coverImage : `${opts.siteUrl}${p.coverImage.startsWith("/") ? "" : "/"}${p.coverImage}`)
        : `${opts.siteUrl}/api/og?title=${encodeURIComponent(p.title)}&type=blog`;
      return (
        `    <item>\n` +
        `      <title>${cdata(p.title)}</title>\n` +
        `      <link>${escapeXml(url)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        (p.author
          ? `      <dc:creator>${cdata(p.author)}</dc:creator>\n`
          : "") +
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
    `    <title>${escapeXml(SITE_NAME)}</title>\n` +
    `    <link>${escapeXml(opts.siteUrl)}</link>\n` +
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>\n` +
    `    <language>en-us</language>\n` +
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />\n` +
    `    <image>\n` +
    `      <url>${escapeXml(opts.siteUrl)}/icon-512.png</url>\n` +
    `      <title>${escapeXml(SITE_NAME)}</title>\n` +
    `      <link>${escapeXml(opts.siteUrl)}</link>\n` +
    `      <width>144</width>\n` +
    `      <height>144</height>\n` +
    `    </image>\n` +
    (itemsXml ? `${itemsXml}\n` : "") +
    `  </channel>\n` +
    `</rss>\n`
  );
}

// Mounted at the root of the app (not under /api) so the canonical feed URL
// is /rss.xml — the standard location feed readers and search engines expect.
router.get("/rss.xml", async (_req, res) => {
  const siteUrl = getSiteUrl();

  const items = await collectAllPosts();
  const xml = buildRss({ siteUrl, items });

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  // Fresh for 5 min in the browser/CDN edge; stale-while-revalidate keeps
  // feed readers snappy without hammering the DB on every poll.
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
});

export default router;
