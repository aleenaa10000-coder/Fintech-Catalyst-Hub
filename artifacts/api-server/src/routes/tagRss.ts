import { Router, type IRouter, type Request, type Response } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { escapeXml, RSS_SITE_DESCRIPTION } from "../lib/seoConstants";

const router: IRouter = Router();

function cdata(value: string): string {
  return `<![CDATA[${String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

type FeedItem = {
  slug:      string;
  title:     string;
  excerpt:   string;
  category:  string;
  date:      string;
  author:    string;
  content?:  string;
  coverImage?: string | null;
};

async function collectTagPosts(tagSlug: string): Promise<FeedItem[]> {
  const apiRows = await db
    .select({
      slug:        blogPostsTable.slug,
      title:       blogPostsTable.title,
      excerpt:     blogPostsTable.excerpt,
      category:    blogPostsTable.category,
      author:      blogPostsTable.author,
      publishedAt: blogPostsTable.publishedAt,
      content:     blogPostsTable.content,
      tags:        blogPostsTable.tags,
      noIndex:     blogPostsTable.noIndex,
      coverImage:  blogPostsTable.coverImage,
    })
    .from(blogPostsTable)
    .where(lte(blogPostsTable.publishedAt, sql`now()`))
    .orderBy(desc(blogPostsTable.publishedAt));

  return apiRows
    .filter(
      (p) =>
        !p.noIndex &&
        Array.isArray(p.tags) &&
        (p.tags as string[]).some(
          (t: string) => t.toLowerCase().replace(/\s+/g, "-") === tagSlug,
        ),
    )
    .map((p) => ({
      slug:       p.slug,
      title:      p.title,
      excerpt:    p.excerpt,
      category:   p.category,
      date:       p.publishedAt.toISOString(),
      author:     p.author,
      content:    p.content,
      coverImage: p.coverImage,
    }));
}

function buildRss(opts: {
  siteUrl:            string;
  selfUrl:            string;
  channelTitle:       string;
  channelLink:        string;
  channelDescription: string;
  items:              FeedItem[];
}): string {
  const lastBuildDate = new Date().toUTCString();
  const items = opts.items
    .map((p) => {
      const url      = `${opts.siteUrl}/blog/${p.slug}`;
      const pubDate  = new Date(p.date).toUTCString();
      const mediaUrl = p.coverImage
        ? (p.coverImage.startsWith("http") ? p.coverImage : `${opts.siteUrl}${p.coverImage.startsWith("/") ? "" : "/"}${p.coverImage}`)
        : `${opts.siteUrl}/api/og?title=${encodeURIComponent(p.title)}&type=blog`;
      return (
        `    <item>\n` +
        `      <title>${cdata(p.title)}</title>\n` +
        `      <link>${escapeXml(url)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        `      <dc:creator>${cdata(p.author)}</dc:creator>\n` +
        `      <category>${cdata(p.category)}</category>\n` +
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
    // TTL (time to live in minutes) — tag feeds refresh at the same cadence
    // as category feeds; 60 min matches CDN s-maxage caching window.
    `    <ttl>60</ttl>\n` +
    // managingEditor + webMaster: RFC 822-format contact fields consumed by
    // Apple News, Google News Ingestion, and feed aggregators for editorial
    // attribution and automated error reporting on per-tag feeds.
    `    <managingEditor>hello@fintechpresshub.com (FintechPressHub)</managingEditor>\n` +
    `    <webMaster>hello@fintechpresshub.com (FintechPressHub)</webMaster>\n` +
    // copyright declares content ownership so syndication platforms can
    // confirm the feed is proprietary before ingesting or republishing it.
    `    <copyright>Copyright ${new Date().getFullYear()} FintechPressHub. All rights reserved.</copyright>\n` +
    // channel <image> improves brand recognition in feed readers and
    // satisfies Apple Podcasts / Apple News channel asset requirements.
    `    <image>\n` +
    `      <url>${escapeXml(opts.siteUrl)}/icon-512.png</url>\n` +
    `      <title>${escapeXml(opts.channelTitle)}</title>\n` +
    `      <link>${escapeXml(opts.channelLink)}</link>\n` +
    `      <width>144</width>\n` +
    `      <height>144</height>\n` +
    `    </image>\n` +
    (items ? `${items}\n` : "") +
    `  </channel>\n` +
    `</rss>\n`
  );
}

async function handleTagRss(req: Request, res: Response): Promise<void> {
  const slug     = String(req.params.slug ?? "").toLowerCase();
  const tagLabel = slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  const siteUrl     = getSiteUrl();
  const selfUrl     = `${siteUrl}/blog/tag/${slug}/rss.xml`;
  const channelLink = `${siteUrl}/blog/tag/${slug}`;
  const items       = await collectTagPosts(slug);

  if (items.length === 0) {
    res.status(404).send("Not found");
    return;
  }

  const xml = buildRss({
    siteUrl,
    selfUrl,
    channelTitle:       `${tagLabel} — FintechPressHub`,
    channelLink,
    channelDescription: `${RSS_SITE_DESCRIPTION} Tag: ${tagLabel}.`,
    items,
  });

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
}

router.get("/blog/tag/:slug/rss.xml", handleTagRss);

export default router;
