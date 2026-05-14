import { Router, type IRouter } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { getKnownAuthorSlugs } from "./authorRss";
import { STATIC_CATEGORY_SLUGS, escapeXml } from "../lib/seoConstants";

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
  { path: "/", changefreq: "weekly", priority: "1.0", lastmod: "2026-05-11" },
  { path: "/about", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-14" },
  { path: "/services", changefreq: "monthly", priority: "0.9", lastmod: "2026-05-14" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9", lastmod: "2026-05-11" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  // /blog/tag intentionally omitted — there is no page at /blog/tag; the only
  // routed path is /blog/tag/:slug. Listing a bare /blog/tag would submit a
  // confirmed soft-404 to Google, wasting crawl budget. Individual tag hub
  // pages are served dynamically at /blog/tag/:slug and appear in
  // /sitemap-tags.xml.
  { path: "/authors", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/write-for-us", changefreq: "monthly", priority: "0.6", lastmod: "2026-04-25" },
  { path: "/editorial-guidelines", changefreq: "yearly", priority: "0.4", lastmod: "2026-04-28" },
  { path: "/tools", changefreq: "monthly", priority: "0.8", lastmod: "2026-05-09" },
  // Tool sub-pages intentionally omitted here — they are covered by the
  // dedicated /sitemap-tools.xml child sitemap (built from TOOL_SLUGS in
  // seoConstants.ts). Listing them here AND there would triplicate every URL
  // across sitemap.xml, sitemap-pages.xml, and sitemap-tools.xml, wasting
  // crawl budget and confusing Google Search Console coverage reports.
  { path: "/locations", changefreq: "weekly", priority: "0.8", lastmod: "2026-05-10" },
  { path: "/glossary", changefreq: "weekly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/resources/fintech-publications", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  { path: "/press", changefreq: "monthly", priority: "0.6", lastmod: "2026-05-09" },
  { path: "/contact", changefreq: "yearly", priority: "0.5", lastmod: "2026-05-14" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/cookie-policy", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/community-guidelines", changefreq: "yearly", priority: "0.3", lastmod: "2026-04-28" },
  { path: "/compare", changefreq: "monthly", priority: "0.7", lastmod: "2026-05-09" },
  // Compare sub-pages intentionally omitted here — covered by /sitemap-compare.xml
  // (built from COMPARE_SLUGS in seoConstants.ts). Same deduplication rationale
  // as tool sub-pages above.
];



/**
 * Tag describing where a sitemap URL came from. Used by the link-checker
 * so the admin dashboard can group results ("3 broken blog posts, 1 broken
 * author RSS feed") without re-parsing the URL.
 *
 * "press-asset" — brand asset download files listed on /press (favicon,
 * icons, apple-touch-icon). Checked by the link-checker but intentionally
 * excluded from the sitemap XML because they are binary files, not pages.
 *
 * "category" — blog category hub pages (/blog/category/:slug). Checked by
 * the link-checker but excluded from the legacy sitemap.xml because they
 * are already covered by /sitemap-pages.xml (child of sitemap_index.xml).
 * Including them in both would duplicate every category URL across two
 * sitemaps and waste crawl budget — the same rationale as tool/compare
 * sub-pages being omitted from STATIC_ROUTES.
 */
export type SitemapEntrySource = "static" | "blog" | "author" | "rss" | "press-asset" | "category";

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
  /** Article title — used by the news:news block for blog entries. */
  title?: string;
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
  const AUTHOR_SLUGS = await getKnownAuthorSlugs();

  // Skip posts the admin marked as no-index — they shouldn't be advertised
  // in the sitemap even though their URL stays publicly reachable. Also
  // skip scheduled (future-dated) posts: their public URLs return 404
  // until the scheduled time passes, so listing them here would feed
  // crawlers broken links.
  const posts = (
    await db
      .select({
        slug:                blogPostsTable.slug,
        title:               blogPostsTable.title,
        publishedAt:         blogPostsTable.publishedAt,
        updatedAt:           blogPostsTable.updatedAt,
        lastMaterialUpdateAt: blogPostsTable.lastMaterialUpdateAt,
        noIndex:             blogPostsTable.noIndex,
        featured:            blogPostsTable.featured,
        coverImage:          blogPostsTable.coverImage,
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
    ...posts.map((p: { slug: string; title: string; publishedAt: Date; updatedAt: Date | null; lastMaterialUpdateAt: Date | null; featured: boolean | null; coverImage: string }) => {
      const { priority, changefreq } = blogPriority(p);
      const imageUrl = resolveImageUrl(siteUrl, p.coverImage);
      // Use the most recent meaningful date — editorial updates (lastMaterialUpdateAt)
      // beat DB row updates (updatedAt) beat publish date. Mirrors sitemapIndex.ts.
      const lastmod = (p.lastMaterialUpdateAt ?? p.updatedAt ?? p.publishedAt)
        .toISOString()
        .slice(0, 10);
      return {
        loc: `${siteUrl}/blog/${p.slug}`,
        lastmod,
        changefreq,
        priority,
        source: "blog" as const,
        title: p.title,
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
    // Source is "category" so the link-checker validates these URLs but the
    // XML renderer below excludes them from sitemap.xml (they are already
    // covered by /sitemap-pages.xml, the authoritative child sitemap).
    ...STATIC_CATEGORY_SLUGS.map((slug) => ({
      loc: `${siteUrl}/blog/category/${slug}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.7",
      source: "category" as const,
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
  // Press-asset and category entries are checked by the link-checker but
  // must not appear in the legacy sitemap.xml XML output:
  //   press-asset — binary files (favicon, icons), not indexable pages.
  //   rss         — XML feeds, not HTML pages.
  //   category    — blog category hub pages already in /sitemap-pages.xml;
  //                 duplicating them here wastes crawl budget.
  // Legacy sitemap.xml is kept as a backward-compatible fallback but should
  // only contain static pages. Blog posts and author pages are already listed
  // in the authoritative child sitemaps (sitemap-blog.xml, sitemap-authors.xml)
  // which are part of sitemap_index.xml. Including them here too causes every
  // URL to appear in multiple sitemaps, wasting crawl budget and making Google
  // Search Console coverage reports harder to read.
  // Blog posts are included here with news:news blocks for Google News
  // discovery. Author/RSS/category/press-asset entries are still excluded
  // to avoid duplicating non-page content.
  const entries = allEntries.filter(
    (e) =>
      e.source !== "press-asset" &&
      e.source !== "rss" &&
      e.source !== "category" &&
      e.source !== "author",
  );

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

      const newsBlock =
        u.source === "blog" && u.title
          ? `    <news:news>\n` +
            `      <news:publication>\n` +
            `        <news:name>FintechPressHub</news:name>\n` +
            `        <news:language>en</news:language>\n` +
            `      </news:publication>\n` +
            `      <news:publication_date>${u.lastmod}</news:publication_date>\n` +
            `      <news:title>${escapeXml(u.title)}</news:title>\n` +
            `    </news:news>\n`
          : "";

      return (
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        (newsBlock ? newsBlock : "") +
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
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n` +
    `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n` +
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
