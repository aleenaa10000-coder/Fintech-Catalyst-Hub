import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { KNOWN_AUTHOR_SLUGS } from "./authorRss";

const router: IRouter = Router();

const STATIC_ROUTES: Array<{
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "monthly", priority: "0.9" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/authors", changefreq: "monthly", priority: "0.7" },
  { path: "/write-for-us", changefreq: "monthly", priority: "0.6", lastmod: "2026-04-25" },
  { path: "/editorial-guidelines", changefreq: "yearly", priority: "0.4", lastmod: "2026-04-28" },
  { path: "/tools/financial-health-score-calculator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/contact", changefreq: "yearly", priority: "0.5", lastmod: "2026-04-25" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
];

// Author profile slugs come straight from the canonical frontend data file
// (`artifacts/fintechpresshub/src/data/authors.ts`) via the per-author RSS
// route — adding a new author there now flows into both the sitemap and the
// per-author feed without a second list to maintain.
const AUTHOR_SLUGS: string[] = KNOWN_AUTHOR_SLUGS;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Tag describing where a sitemap URL came from. Used by the link-checker
 * so the admin dashboard can group results ("3 broken blog posts, 1 broken
 * author RSS feed") without re-parsing the URL.
 */
export type SitemapEntrySource = "static" | "blog" | "author" | "rss";

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  source: SitemapEntrySource;
}

/**
 * Build the canonical list of URLs that belong in the sitemap. Shared
 * between the XML renderer below and the link-checker job so the two
 * never drift — adding a new static route or author updates both.
 */
export async function buildSitemapEntries(): Promise<SitemapEntry[]> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  // Skip posts the admin marked as no-index — they shouldn't be advertised
  // in the sitemap even though their URL stays publicly reachable.
  const posts = (
    await db
      .select({
        slug: blogPostsTable.slug,
        publishedAt: blogPostsTable.publishedAt,
        noIndex: blogPostsTable.noIndex,
      })
      .from(blogPostsTable)
      .orderBy(desc(blogPostsTable.publishedAt))
  ).filter((p) => !p.noIndex);

  return [
    ...STATIC_ROUTES.map((r) => ({
      // Always include the path, including the root "/", so the homepage
      // <loc> matches the canonical URL emitted in index.html and avoids
      // sitemap-validator warnings about a missing trailing slash on root.
      loc: `${siteUrl}${r.path}`,
      lastmod: r.lastmod ?? today,
      changefreq: r.changefreq,
      priority: r.priority,
      source: "static" as const,
    })),
    ...posts.map((p) => ({
      loc: `${siteUrl}/blog/${p.slug}`,
      lastmod: p.publishedAt.toISOString().slice(0, 10),
      changefreq: "monthly",
      priority: "0.7",
      source: "blog" as const,
    })),
    ...AUTHOR_SLUGS.map((slug) => ({
      loc: `${siteUrl}/authors/${slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.6",
      source: "author" as const,
    })),
    // Per-author RSS feeds — listed so search engines and feed-discovery
    // crawlers can find them without parsing the HTML autodiscovery link.
    ...AUTHOR_SLUGS.map((slug) => ({
      loc: `${siteUrl}/authors/${slug}/rss.xml`,
      lastmod: today,
      changefreq: "daily",
      priority: "0.4",
      source: "rss" as const,
    })),
  ];
}

async function buildSitemapXml(): Promise<string> {
  const entries = await buildSitemapEntries();

  const body = entries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `\n</urlset>\n`
  );
}

async function handleSitemap(
  _req: import("express").Request,
  res: import("express").Response,
): Promise<void> {
  const xml = await buildSitemapXml();
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.send(xml);
}

// Mounted at the root of the app (not under /api) so /sitemap.xml resolves
// directly. We also expose /api/sitemap.xml for callers that prefer the
// namespaced path.
router.get("/sitemap.xml", handleSitemap);

export default router;
