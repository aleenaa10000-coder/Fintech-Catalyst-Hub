import { Router, type IRouter } from "express";
import { db, blogPostsTable, locationPagesTable, glossaryTermsTable, servicesTable } from "@workspace/db";
import { asc, desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { KNOWN_AUTHOR_SLUGS } from "./authorRss";
import { STATIC_ROUTES } from "./sitemap";
import { STATIC_CATEGORY_SLUGS, TOOL_SLUGS, COMPARE_SLUGS } from "../lib/seoConstants";

const router: IRouter = Router();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sitemap Index — /sitemap_index.xml
 *
 * Child sitemaps:
 *   /sitemap-pages.xml     — static pages + author profiles + category hubs + services
 *   /sitemap-blog.xml      — blog posts (scales to 50 000 URLs)
 *   /sitemap-authors.xml   — author profiles + per-author RSS feeds
 *   /sitemap-locations.xml — DB-driven location pages (/locations/:slug)
 *   /sitemap-glossary.xml  — DB-driven glossary term pages (/glossary/:slug)
 *   /news-sitemap.xml      — Google News
 */

async function getLatestBlogDate(): Promise<string> {
  const [latest] = await db
    .select({ publishedAt: blogPostsTable.publishedAt })
    .from(blogPostsTable)
    .where(lte(blogPostsTable.publishedAt, sql`now()`))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(1);
  return (latest?.publishedAt ?? new Date()).toISOString().slice(0, 10);
}

async function getLatestLocationDate(): Promise<string> {
  const [latest] = await db
    .select({ publishedAt: locationPagesTable.publishedAt })
    .from(locationPagesTable)
    .orderBy(desc(locationPagesTable.publishedAt))
    .limit(1);
  return (latest?.publishedAt ?? new Date()).toISOString().slice(0, 10);
}

async function getLatestGlossaryDate(): Promise<string> {
  const [latest] = await db
    .select({ updatedAt: glossaryTermsTable.updatedAt })
    .from(glossaryTermsTable)
    .orderBy(desc(glossaryTermsTable.updatedAt))
    .limit(1);
  return (latest?.updatedAt ?? new Date()).toISOString().slice(0, 10);
}

async function buildSitemapIndexXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const [latestBlogDate, latestLocationDate, latestGlossaryDate] = await Promise.all([
    getLatestBlogDate(),
    getLatestLocationDate(),
    getLatestGlossaryDate(),
  ]);

  const sitemaps = [
    { loc: `${siteUrl}/sitemap-pages.xml`,     lastmod: today },
    { loc: `${siteUrl}/sitemap-blog.xml`,      lastmod: latestBlogDate },
    { loc: `${siteUrl}/sitemap-authors.xml`,   lastmod: today },
    { loc: `${siteUrl}/sitemap-locations.xml`, lastmod: latestLocationDate },
    { loc: `${siteUrl}/sitemap-glossary.xml`,  lastmod: latestGlossaryDate },
    { loc: `${siteUrl}/sitemap-tools.xml`,     lastmod: today },
    { loc: `${siteUrl}/sitemap-compare.xml`,   lastmod: today },
    { loc: `${siteUrl}/news-sitemap.xml`,      lastmod: today },
  ];

  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n` +
        `    <loc>${escapeXml(s.loc)}</loc>\n` +
        `    <lastmod>${s.lastmod}</lastmod>\n` +
        `  </sitemap>`,
    )
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries + "\n" +
    `</sitemapindex>\n`
  );
}

// ── /sitemap-pages.xml ───────────────────────────────────────────────────────

async function buildPagesSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = STATIC_ROUTES.map((r) => ({
    loc: `${siteUrl}${r.path}`,
    lastmod: r.lastmod ?? today,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  const categoryEntries = STATIC_CATEGORY_SLUGS.map((slug) => ({
    loc: `${siteUrl}/blog/category/${slug}`,
    lastmod: today,
    changefreq: "weekly",
    priority: "0.7",
  }));

  const authorEntries = KNOWN_AUTHOR_SLUGS.map((slug) => ({
    loc: `${siteUrl}/authors/${slug}`,
    lastmod: today,
    changefreq: "monthly",
    priority: "0.6",
  }));

  // Service detail pages from DB — dynamic so newly created services appear
  // automatically without a code deploy.
  const serviceRows = await db
    .select({ slug: servicesTable.slug, name: servicesTable.name })
    .from(servicesTable)
    .orderBy(asc(servicesTable.id));

  const serviceEntries = serviceRows.map((s) => ({
    loc: `${siteUrl}/services/${s.slug}`,
    lastmod: today,
    changefreq: "monthly",
    priority: "0.8",
  }));

  const all = [...staticEntries, ...categoryEntries, ...authorEntries, ...serviceEntries];

  const body = all
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`,
    )
    .join("\n");

  return xmlUrlset(body);
}

// ── /sitemap-blog.xml ────────────────────────────────────────────────────────

async function buildBlogSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

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
  ).filter((p) => !p.noIndex);

  const body = posts
    .map((p) => {
      const isRecent = p.publishedAt >= ninetyDaysAgo;
      const priority = p.featured ? "0.9" : isRecent ? "0.7" : "0.6";
      const changefreq = p.featured || isRecent ? "weekly" : "monthly";
      const loc = `${siteUrl}/blog/${p.slug}`;
      const imageUrl = p.coverImage?.startsWith("http") ? p.coverImage : `${siteUrl}${p.coverImage}`;
      // Use the most recent material edit date so Google recrawls updated posts.
      const lastmod = (p.lastMaterialUpdateAt ?? p.updatedAt ?? p.publishedAt)
        .toISOString()
        .slice(0, 10);
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${changefreq}</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        (p.coverImage
          ? `    <image:image>\n` +
            `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
            `      <image:title>${escapeXml(p.title)}</image:title>\n` +
            `    </image:image>\n`
          : "") +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
}

// ── /sitemap-authors.xml ─────────────────────────────────────────────────────

async function buildAuthorsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const entries = KNOWN_AUTHOR_SLUGS.flatMap((slug) => [
    { loc: `${siteUrl}/authors/${slug}`, changefreq: "monthly", priority: "0.6", isPage: true },
    { loc: `${siteUrl}/authors/${slug}/rss.xml`, changefreq: "daily", priority: "0.4", isPage: false },
  ]);

  const body = entries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        (u.isPage
          ? `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n`
          : "") +
        `  </url>`,
    )
    .join("\n");

  return xmlUrlset(body);
}

// ── /sitemap-locations.xml ───────────────────────────────────────────────────

async function buildLocationsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const locations = await db
    .select({
      slug:        locationPagesTable.slug,
      city:        locationPagesTable.city,
      publishedAt: locationPagesTable.publishedAt,
    })
    .from(locationPagesTable)
    .orderBy(asc(locationPagesTable.country), asc(locationPagesTable.city));

  if (locations.length === 0) {
    return xmlUrlset("");
  }

  const body = locations
    .map((loc) => {
      const url = `${siteUrl}/locations/${loc.slug}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(url)}</loc>\n` +
        `    <lastmod>${loc.publishedAt.toISOString().slice(0, 10)}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>0.7</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(url)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body);
}

// ── /sitemap-glossary.xml ────────────────────────────────────────────────────

async function buildGlossarySitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const terms = await db
    .select({
      slug:      glossaryTermsTable.slug,
      updatedAt: glossaryTermsTable.updatedAt,
    })
    .from(glossaryTermsTable)
    .orderBy(asc(glossaryTermsTable.term));

  if (terms.length === 0) {
    return xmlUrlset("");
  }

  const body = terms
    .map((t) => {
      const url = `${siteUrl}/glossary/${t.slug}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(url)}</loc>\n` +
        `    <lastmod>${t.updatedAt.toISOString().slice(0, 10)}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        // Glossary definition pages target high-intent vocabulary queries;
        // raising to 0.7 signals stronger crawl-budget priority to Google.
        `    <priority>0.7</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(url)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body);
}

// ── /sitemap-tools.xml ───────────────────────────────────────────────────────

async function buildToolsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const entries = [
    { loc: `${siteUrl}/tools`, changefreq: "monthly", priority: "0.8" },
    ...TOOL_SLUGS.map((slug) => ({
      loc: `${siteUrl}/tools/${slug}`,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  const body = entries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`,
    )
    .join("\n");

  return xmlUrlset(body);
}

// ── /sitemap-compare.xml ─────────────────────────────────────────────────────

async function buildCompareSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const entries = [
    { loc: `${siteUrl}/compare`, changefreq: "monthly", priority: "0.6" },
    ...COMPARE_SLUGS.map((slug) => ({
      loc: `${siteUrl}/compare/${slug}`,
      changefreq: "monthly",
      priority: "0.6",
    })),
  ];

  const body = entries
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`,
    )
    .join("\n");

  return xmlUrlset(body);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function xmlUrlset(body: string, withImage = false): string {
  const imageNs = withImage
    ? `\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`
    : "";
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    body + "\n" +
    `</urlset>\n`
  );
}

const CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

router.get("/sitemap_index.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildSitemapIndexXml());
});

router.get("/sitemap-pages.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildPagesSitemapXml());
});

router.get("/sitemap-blog.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildBlogSitemapXml());
});

router.get("/sitemap-authors.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildAuthorsSitemapXml());
});

router.get("/sitemap-locations.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildLocationsSitemapXml());
});

router.get("/sitemap-glossary.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildGlossarySitemapXml());
});

router.get("/sitemap-tools.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildToolsSitemapXml());
});

router.get("/sitemap-compare.xml", async (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.send(await buildCompareSitemapXml());
});

export default router;
