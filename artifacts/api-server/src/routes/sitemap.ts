import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { KNOWN_AUTHOR_SLUGS } from "./authorRss";
import { STATIC_CATEGORY_SLUGS } from "../lib/seoConstants";

/** Resolve a cover-image value to a fully-qualified URL. */
function resolveImageUrl(siteUrl: string, raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Relative paths like /objects/... or /images/...
  return `${siteUrl}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

const router: IRouter = Router();

export const STATIC_ROUTES: Array<{
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
  { path: "/tools", changefreq: "monthly", priority: "0.8", lastmod: "2026-05-09" },
  { path: "/tools/financial-health-score-calculator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/meta-description-generator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/guest-post-pitch-generator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/readability-checker", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/keyword-difficulty-estimator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/backlink-value-estimator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/content-brief-generator", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/headline-analyzer", changefreq: "monthly", priority: "0.7", lastmod: "2026-04-25" },
  { path: "/tools/link-prospector", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/tools/outreach-email-generator", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/glossary", changefreq: "weekly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/resources/fintech-publications", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/press", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/contact", changefreq: "yearly", priority: "0.5", lastmod: "2026-04-25" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/community-guidelines", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/compare", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/agency-vs-in-house", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/vs-freelancers", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/vs-seo-tools", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/vs-pr-agencies", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/content-led-vs-paid", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/compare/specialist-vs-generalist", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
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
 *
 * "press-asset" — brand asset download files listed on /press (favicon,
 * icons, apple-touch-icon). Checked by the link-checker but intentionally
 * excluded from the sitemap XML because they are binary files, not pages.
 */
export type SitemapEntrySource = "static" | "blog" | "author" | "rss" | "press-asset";

/**
 * Paths of brand asset files served from the site root that the daily
 * link-checker should verify. Kept here so the link-checker and the
 * /press page stay in sync — both reference this single source of truth.
 */
export const PRESS_BRAND_ASSET_PATHS = [
  "/favicon.svg",
  "/icon-512.png",
  "/icon-192.png",
  "/apple-touch-icon.png",
] as const;

export interface SitemapImage {
  loc: string;
  title?: string;
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  source: SitemapEntrySource;
  images?: SitemapImage[];
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
  // in the sitemap even though their URL stays publicly reachable. Also
  // skip scheduled (future-dated) posts: their public URLs return 404
  // until the scheduled time passes, so listing them here would feed
  // crawlers broken links.
  const posts = (
    await db
      .select({
        slug: blogPostsTable.slug,
        title: blogPostsTable.title,
        publishedAt: blogPostsTable.publishedAt,
        noIndex: blogPostsTable.noIndex,
        featured: blogPostsTable.featured,
        coverImage: blogPostsTable.coverImage,
      })
      .from(blogPostsTable)
      .where(lte(blogPostsTable.publishedAt, sql`now()`))
      .orderBy(desc(blogPostsTable.publishedAt))
  ).filter((p: { noIndex: boolean | null }) => !p.noIndex);

  // Priority tiers for blog posts:
  //   0.9  — editorially featured (pinned on homepage "Latest Insights")
  //   0.7  — published within the last 90 days (fresh content signal)
  //   0.6  — older, non-featured posts
  //
  // changefreq mirrors priority: featured/recent posts are re-crawled
  // weekly so updates surface quickly; older posts monthly.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  function blogPriority(p: { featured: boolean | null; publishedAt: Date }): {
    priority: string;
    changefreq: string;
  } {
    if (p.featured) return { priority: "0.9", changefreq: "weekly" };
    if (p.publishedAt >= ninetyDaysAgo) return { priority: "0.7", changefreq: "weekly" };
    return { priority: "0.6", changefreq: "monthly" };
  }

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
    ...posts.map((p: { slug: string; title: string; publishedAt: Date; featured: boolean | null; coverImage: string }) => {
      const { priority, changefreq } = blogPriority(p);
      const imageUrl = resolveImageUrl(siteUrl, p.coverImage);
      return {
        loc: `${siteUrl}/blog/${p.slug}`,
        lastmod: p.publishedAt.toISOString().slice(0, 10),
        changefreq,
        priority,
        source: "blog" as const,
        ...(imageUrl ? { images: [{ loc: imageUrl, title: p.title }] } : {}),
      };
    }),
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
    // Blog category hub pages — one entry per known category slug.
    ...STATIC_CATEGORY_SLUGS.map((slug) => ({
      loc: `${siteUrl}/blog/category/${slug}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.7",
      source: "static" as const,
    })),
    // Press page brand asset downloads — checked by the daily link-checker
    // but excluded from the sitemap XML (they're binary files, not pages).
    ...PRESS_BRAND_ASSET_PATHS.map((path) => ({
      loc: `${siteUrl}${path}`,
      lastmod: today,
      changefreq: "yearly",
      priority: "0.1",
      source: "press-asset" as const,
    })),
  ];
}

async function buildSitemapXml(): Promise<string> {
  const allEntries = await buildSitemapEntries();
  // Press-asset entries are checked by the link-checker but must not
  // appear in the XML sitemap — search engines should index pages, not
  // raw binary files.
  const entries = allEntries.filter((e) => e.source !== "press-asset");

  const body = entries
    .map((u) => {
      const imageBlocks = (u.images ?? [])
        .map(
          (img) =>
            `    <image:image>\n` +
            `      <image:loc>${escapeXml(img.loc)}</image:loc>\n` +
            (img.title
              ? `      <image:title>${escapeXml(img.title)}</image:title>\n`
              : "") +
            `    </image:image>`,
        )
        .join("\n");

      // hreflang self-referential annotations inside the sitemap.
      // Google recommends declaring language/locale inside sitemaps as an
      // alternative to HTML <link rel="alternate" hreflang> tags.
      // For a single-language English site we emit "en" + "x-default" both
      // pointing to the same canonical URL. RSS feed entries are skipped
      // because they are not HTML pages and don't carry language metadata.
      const hreflangBlocks =
        u.source !== "rss"
          ? [
              `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>`,
              `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>`,
            ].join("\n")
          : "";

      return (
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        (imageBlocks ? imageBlocks + "\n" : "") +
        (hreflangBlocks ? hreflangBlocks + "\n" : "") +
        `  </url>`
      );
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
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
