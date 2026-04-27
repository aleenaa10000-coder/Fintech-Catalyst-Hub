import { Router, type IRouter, type Request, type Response } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import staticPostsRaw from "../../../fintechpresshub/src/data/posts.js";
import {
  authors,
  authorSlugFromName,
  getAuthorBySlug,
} from "../../../fintechpresshub/src/data/authors";

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

const router: IRouter = Router();

const SITE_DESCRIPTION =
  "Insights, playbooks, and field reports on fintech SEO, content marketing, and digital PR.";

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
};

async function collectAuthorPosts(authorSlug: string): Promise<FeedItem[]> {
  const fromStatic: FeedItem[] = staticPosts
    .filter((p) => authorSlugFromName(p.author) === authorSlug)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.date,
      content: p.content,
    }));

  // API-published posts overlay seed posts on slug collision (same rule used
  // by the public-facing usePublicPosts hook).
  const apiRows = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      excerpt: blogPostsTable.excerpt,
      category: blogPostsTable.category,
      author: blogPostsTable.author,
      publishedAt: blogPostsTable.publishedAt,
      content: blogPostsTable.content,
    })
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.publishedAt));

  const merged = new Map<string, FeedItem>();
  for (const p of fromStatic) merged.set(p.slug, p);
  for (const p of apiRows) {
    if (authorSlugFromName(p.author) !== authorSlug) continue;
    merged.set(p.slug, {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.publishedAt.toISOString(),
      content: p.content,
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
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
        `    </item>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"\n` +
    `  xmlns:content="http://purl.org/rss/1.0/modules/content/"\n` +
    `  xmlns:dc="http://purl.org/dc/elements/1.1/"\n` +
    `  xmlns:atom="http://www.w3.org/2005/Atom">\n` +
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
  const author = getAuthorBySlug(slug);
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

// Mounted at the root of the app (not under /api) so author feed URLs match
// the public profile URL pattern: /authors/<slug>/rss.xml
router.get("/authors/:slug/rss.xml", handleAuthorRss);

// Convenience export so the sitemap router can keep its author slug list in
// sync with the canonical authors data without duplicating the array.
export const KNOWN_AUTHOR_SLUGS: string[] = authors.map((a) => a.slug);

export default router;
