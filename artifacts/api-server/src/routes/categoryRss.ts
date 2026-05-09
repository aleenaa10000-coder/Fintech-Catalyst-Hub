import { Router, type IRouter, type Request, type Response } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
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

const router: IRouter = Router();

const SITE_DESCRIPTION =
  "Insights, playbooks, and field reports on fintech SEO, content marketing, and digital PR.";

const CATEGORY_LABELS: Record<string, string> = {
  "payments": "Payments",
  "embedded-finance": "Embedded Finance",
  "open-banking": "Open Banking",
  "neobanking": "Neobanking",
  "lending": "Lending",
  "regtech": "RegTech",
};

function slugToCategory(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

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
  author: string;
  content?: string;
};

async function collectCategoryPosts(categorySlug: string): Promise<FeedItem[]> {
  const categoryLabel = slugToCategory(categorySlug);

  const fromStatic: FeedItem[] = staticPosts
    .filter((p) => {
      const pCatSlug = p.category
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      return pCatSlug === categorySlug || p.category === categoryLabel;
    })
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.date,
      author: p.author,
      content: p.content,
    }));

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
    .where(lte(blogPostsTable.publishedAt, sql`now()`))
    .orderBy(desc(blogPostsTable.publishedAt));

  const merged = new Map<string, FeedItem>();
  for (const p of fromStatic) merged.set(p.slug, p);
  for (const p of apiRows) {
    const pCatSlug = p.category
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (pCatSlug !== categorySlug && p.category !== categoryLabel) continue;
    merged.set(p.slug, {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      date: p.publishedAt.toISOString(),
      author: p.author,
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
        `      <dc:creator>${cdata(p.author)}</dc:creator>\n` +
        `      <category>${cdata(p.category)}</category>\n` +
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

async function handleCategoryRss(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug ?? "").toLowerCase();
  const categoryLabel = slugToCategory(slug);

  const siteUrl = getSiteUrl();
  const selfUrl = `${siteUrl}/blog/category/${slug}/rss.xml`;
  const channelLink = `${siteUrl}/blog/category/${slug}`;
  const items = await collectCategoryPosts(slug);

  const xml = buildRss({
    siteUrl,
    selfUrl,
    channelTitle: `${categoryLabel} — FintechPressHub`,
    channelLink,
    channelDescription: `${SITE_DESCRIPTION} Category: ${categoryLabel}.`,
    items,
  });

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
}

router.get("/blog/category/:slug/rss.xml", handleCategoryRss);

export default router;
