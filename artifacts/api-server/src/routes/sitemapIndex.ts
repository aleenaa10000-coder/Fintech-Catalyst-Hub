import { Router, type IRouter } from "express";
import { db, blogPostsTable, locationPagesTable, glossaryTermsTable, servicesTable, authorsTable } from "@workspace/db";
import { asc, desc, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { getKnownAuthorSlugs } from "./authorRss";
import { STATIC_ROUTES } from "./sitemap";
import { STATIC_CATEGORY_SLUGS, TOOL_SLUGS, COMPARE_SLUGS, SERVICE_SLUGS, TOOL_PAGE_LASTMOD, COMPARE_PAGE_LASTMOD, SERVICE_PAGE_LASTMOD_DATE, escapeXml, CATEGORY_LABELS } from "../lib/seoConstants";

const router: IRouter = Router();

// ── In-memory sitemap cache ───────────────────────────────────────────────────
//
// Sitemaps are queried on every Googlebot crawl request. Under heavy crawl
// pressure (which Google applies to fast sites) this causes multiple DB round-
// trips per minute for queries that return identical XML between publishes.
//
// The cache below stores each sitemap's XML string with a 5-minute TTL. This
// matches the HTTP Cache-Control s-maxage=3600 header (CDN will cache longer),
// but protects the DB when no CDN sits in front (e.g. Hostinger direct hits,
// Bing/Yandex bots that ignore cache headers).
//
// Invalidation: process restart (new deploy) always clears the cache because
// the Map is module-level, not persistent. Per-publish IndexNow pings happen
// via seo.ts and are unaffected by this cache.
const SITEMAP_TTL_MS = 5 * 60 * 1000;
type SitemapCacheEntry = { xml: string; cachedAt: number };
const _sitemapCache = new Map<string, SitemapCacheEntry>();

function getCachedSitemap(key: string): string | null {
  const entry = _sitemapCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > SITEMAP_TTL_MS) {
    _sitemapCache.delete(key);
    return null;
  }
  return entry.xml;
}

function setCachedSitemap(key: string, xml: string): void {
  _sitemapCache.set(key, { xml, cachedAt: Date.now() });
}

/**
 * Imperatively evict all cached sitemap XML strings.
 * Call this after any content publish or update so Googlebot gets a
 * fresh sitemap on its next crawl without waiting for the 5-minute TTL.
 */
export function invalidateSitemapCache(): void {
  _sitemapCache.clear();
}

/** Convert a URL slug to a human-readable title for OG image generation. */
function humanizeSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
    .select({ updatedAt: locationPagesTable.updatedAt })
    .from(locationPagesTable)
    .orderBy(desc(locationPagesTable.updatedAt))
    .limit(1);
  return (latest?.updatedAt ?? new Date()).toISOString().slice(0, 10);
}

async function getLatestGlossaryDate(): Promise<string> {
  const [latest] = await db
    .select({ updatedAt: glossaryTermsTable.updatedAt })
    .from(glossaryTermsTable)
    .orderBy(desc(glossaryTermsTable.updatedAt))
    .limit(1);
  return (latest?.updatedAt ?? new Date()).toISOString().slice(0, 10);
}

function getLatestServiceDate(): string {
  // Services are seeded once and change infrequently. Return the canonical
  // SERVICE_PAGE_LASTMOD_DATE from seoConstants so the sitemap index entry
  // only signals a change when content actually changes — preventing Google
  // from wasting crawl budget re-fetching an unchanged sitemap-services.xml.
  return SERVICE_PAGE_LASTMOD_DATE;
}

async function getLatestAuthorDate(): Promise<string> {
  const [latest] = await db
    .select({ updatedAt: authorsTable.updatedAt })
    .from(authorsTable)
    .orderBy(desc(authorsTable.updatedAt))
    .limit(1);
  return (latest?.updatedAt ?? new Date()).toISOString().slice(0, 10);
}

async function buildSitemapIndexXml(): Promise<string> {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const [latestBlogDate, latestLocationDate, latestGlossaryDate, latestServiceDate, latestAuthorDate] = await Promise.all([
    getLatestBlogDate(),
    getLatestLocationDate(),
    getLatestGlossaryDate(),
    getLatestServiceDate(),
    getLatestAuthorDate(),
  ]);

  const sitemaps = [
    { loc: `${siteUrl}/sitemap-pages.xml`,     lastmod: latestBlogDate },
    { loc: `${siteUrl}/sitemap-blog.xml`,      lastmod: latestBlogDate },
    { loc: `${siteUrl}/sitemap-tags.xml`,      lastmod: latestBlogDate },
    { loc: `${siteUrl}/sitemap-authors.xml`,   lastmod: latestAuthorDate },
    { loc: `${siteUrl}/sitemap-locations.xml`, lastmod: latestLocationDate },
    { loc: `${siteUrl}/sitemap-glossary.xml`,  lastmod: latestGlossaryDate },
    { loc: `${siteUrl}/sitemap-services.xml`,  lastmod: latestServiceDate },
    { loc: `${siteUrl}/sitemap-tools.xml`,     lastmod: Object.values(TOOL_PAGE_LASTMOD).reduce((a, b) => (a > b ? a : b)) },
    { loc: `${siteUrl}/sitemap-compare.xml`,   lastmod: Object.values(COMPARE_PAGE_LASTMOD).reduce((a, b) => (a > b ? a : b)) },
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
  // Category hub pages are "updated" each time a new post is published in
  // that category. Using latestBlogDate tells Google to recrawl them when
  // there is genuinely new content — not on every request like `today` did.
  const latestBlogDate = await getLatestBlogDate();

  const staticEntries = STATIC_ROUTES.map((r) => ({
    loc:        `${siteUrl}${r.path}`,
    lastmod:    r.lastmod ?? today,
    changefreq: r.changefreq,
    priority:   r.priority,
    imageUrl:   undefined as string | undefined,
    imageTitle: undefined as string | undefined,
  }));

  // Category hub pages include an OG image hint so Google Images can index
  // the branded card for each topic, improving visual search presence and
  // increasing rich-result eligibility for category-level queries.
  const categoryEntries = STATIC_CATEGORY_SLUGS.map((slug) => {
    const label = CATEGORY_LABELS[slug] ?? humanizeSlug(slug);
    return {
      loc:        `${siteUrl}/blog/category/${slug}`,
      lastmod:    latestBlogDate,
      changefreq: "weekly",
      priority:   "0.7",
      imageUrl:   `${siteUrl}/api/og?title=${encodeURIComponent(label)}&category=${encodeURIComponent("Blog")}`,
      imageTitle: label,
    };
  });

  // Author and service detail pages are intentionally omitted here — they are
  // already covered by their dedicated child sitemaps (sitemap-authors.xml and
  // sitemap-services.xml), which carry richer hreflang attributes and accurate
  // per-page lastmod values. Including them here too would duplicate every URL
  // across two child sitemaps and waste crawl budget — the same rationale as
  // tool/compare sub-pages being omitted from STATIC_ROUTES in sitemap.ts.

  const all = [...staticEntries, ...categoryEntries];
  const hasImages = categoryEntries.length > 0;

  const body = all
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        (u.imageUrl
          ? `    <image:image>\n` +
            `      <image:loc>${escapeXml(u.imageUrl)}</image:loc>\n` +
            `      <image:title>${escapeXml(u.imageTitle!)}</image:title>\n` +
            `    </image:image>\n`
          : "") +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`,
    )
    .join("\n");

  return xmlUrlset(body, hasImages);
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
        blufSummary:         blogPostsTable.blufSummary,
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
            (p.blufSummary
              ? `      <image:caption>${escapeXml(p.blufSummary.slice(0, 200))}</image:caption>\n`
              : "") +
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

  // Fetch author slugs + photos from the DB. Photos are included as
  // <image:image> entries so Google Images can discover and index author
  // headshots, which strengthens E-E-A-T signals for the site.
  // Fall back to the static KNOWN_AUTHOR_SLUGS list (no photos) if the
  // DB query fails, so the sitemap is never empty due to a DB outage.
  const dbAuthors = await db
    .select({ slug: authorsTable.slug, photo: authorsTable.photo, name: authorsTable.name, role: authorsTable.role, updatedAt: authorsTable.updatedAt })
    .from(authorsTable)
    .orderBy(asc(authorsTable.slug))
    .catch(() => [] as Array<{ slug: string; photo: string | null; name: string; role: string | null; updatedAt: Date | null }>);

  const photoMap = new Map<string, { photo: string | null; name: string; role: string | null; updatedAt: Date | null }>(
    dbAuthors.map((a) => [a.slug, { photo: a.photo ?? null, name: a.name, role: a.role ?? null, updatedAt: a.updatedAt ?? null }]),
  );
  const slugs = dbAuthors.length > 0
    ? dbAuthors.map((a) => a.slug)
    : await getKnownAuthorSlugs();

  const hasAnyPhoto = slugs.some((s) => photoMap.get(s)?.photo);

  // RSS feed entries (.rss.xml) are XML documents, not HTML pages.
  // They must never appear in an HTML page sitemap — Google would attempt
  // to index them as web pages, creating soft-404s and wasted crawl budget.
  const body = slugs
    .map((slug) => {
      const loc = `${siteUrl}/authors/${slug}`;
      const authorData = photoMap.get(slug);
      const rawPhoto = authorData?.photo ?? null;
      const displayName = authorData?.name ?? humanizeSlug(slug);
      const authorTitle = authorData?.role
        ? `${displayName} — ${authorData.role} | FintechPressHub`
        : `${displayName} | FintechPressHub`;
      const resolvedPhoto = rawPhoto
        ? (rawPhoto.startsWith("http") ? rawPhoto : `${siteUrl}${rawPhoto}`)
        : null;
      // Use the actual DB updatedAt so Google only recrawls when an author
      // profile genuinely changes — not every day like `today` would signal.
      const lastmod = authorData?.updatedAt?.toISOString().slice(0, 10) ?? today;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>0.6</priority>\n` +
        (resolvedPhoto
          ? `    <image:image>\n` +
            `      <image:loc>${escapeXml(resolvedPhoto)}</image:loc>\n` +
            `      <image:title>${escapeXml(authorTitle)}</image:title>\n` +
            `    </image:image>\n`
          : "") +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, hasAnyPhoto);
}

// ── /sitemap-locations.xml ───────────────────────────────────────────────────

async function buildLocationsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const locations = await db
    .select({
      slug:        locationPagesTable.slug,
      city:        locationPagesTable.city,
      publishedAt: locationPagesTable.publishedAt,
      updatedAt:   locationPagesTable.updatedAt,
    })
    .from(locationPagesTable)
    .orderBy(asc(locationPagesTable.country), asc(locationPagesTable.city));

  if (locations.length === 0) {
    return xmlUrlset("");
  }

  const body = locations
    .map((loc) => {
      const url = `${siteUrl}/locations/${loc.slug}`;
      const lastmod = (loc.updatedAt ?? loc.publishedAt).toISOString().slice(0, 10);
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(loc.city)}&category=${encodeURIComponent("Location")}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(url)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>0.7</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(loc.city)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(url)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
}

// ── /sitemap-glossary.xml ────────────────────────────────────────────────────

async function buildGlossarySitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const terms = await db
    .select({
      slug:      glossaryTermsTable.slug,
      term:      glossaryTermsTable.term,
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
      // Include a branded OG image for each glossary term so Google Images can
      // index the /api/og card, matching the treatment of blog, tools, compare,
      // services, authors, and location sitemaps. Improves visual search
      // presence and rich-result eligibility for vocabulary-intent queries.
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(t.term)}&category=${encodeURIComponent("Glossary")}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(url)}</loc>\n` +
        `    <lastmod>${t.updatedAt.toISOString().slice(0, 10)}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        // Glossary definition pages target high-intent vocabulary queries;
        // raising to 0.7 signals stronger crawl-budget priority to Google.
        `    <priority>0.7</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(t.term)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(url)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
}

// ── /sitemap-tools.xml ───────────────────────────────────────────────────────

async function buildToolsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const toolsHubLastmod = Object.values(TOOL_PAGE_LASTMOD).reduce((a, b) => (a > b ? a : b));

  const entries = [
    {
      loc:        `${siteUrl}/tools`,
      lastmod:    toolsHubLastmod,
      changefreq: "monthly",
      priority:   "0.8",
      ogTitle:    "Free Fintech Marketing Tools",
      category:   "Tools",
    },
    ...TOOL_SLUGS.map((slug) => ({
      loc:        `${siteUrl}/tools/${slug}`,
      lastmod:    TOOL_PAGE_LASTMOD[slug] ?? SERVICE_PAGE_LASTMOD_DATE,
      changefreq: "monthly",
      priority:   "0.7",
      ogTitle:    humanizeSlug(slug),
      category:   "Free Tool",
    })),
  ];

  // Include OG images as <image:image> entries so Google's image crawler
  // indexes the branded card for each tool, improving visual search presence
  // and increasing the chance of image-rich results for tool-related queries.
  const body = entries
    .map((u) => {
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(u.ogTitle)}&category=${encodeURIComponent(u.category)}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(u.ogTitle)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
}

// ── /sitemap-compare.xml ─────────────────────────────────────────────────────

async function buildCompareSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const compareHubLastmod = Object.values(COMPARE_PAGE_LASTMOD).reduce((a, b) => (a > b ? a : b));

  const entries = [
    {
      loc:        `${siteUrl}/compare`,
      lastmod:    compareHubLastmod,
      changefreq: "monthly",
      priority:   "0.6",
      ogTitle:    "Fintech SEO Agency Comparisons",
      category:   "Compare",
    },
    ...COMPARE_SLUGS.map((slug) => ({
      loc:        `${siteUrl}/compare/${slug}`,
      lastmod:    COMPARE_PAGE_LASTMOD[slug] ?? "2026-05-09",
      changefreq: "monthly",
      priority:   "0.6",
      ogTitle:    humanizeSlug(slug),
      category:   "Compare",
    })),
  ];

  // Include OG images so Google Images indexes the branded card for each
  // comparison page — improves visual search presence and social sharing.
  const body = entries
    .map((u) => {
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(u.ogTitle)}&category=${encodeURIComponent(u.category)}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(u.ogTitle)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
}

// ── /sitemap-services.xml ────────────────────────────────────────────────────

async function buildServicesSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  // Select name as well so we can generate accurate OG image titles.
  const services = await db
    .select({ slug: servicesTable.slug, name: servicesTable.name })
    .from(servicesTable)
    .orderBy(asc(servicesTable.slug))
    .catch(() => [] as Array<{ slug: string; name: string }>);

  // Fall back to known slugs from seoConstants when the DB has no service rows.
  const entries: Array<{ loc: string; lastmod: string; name: string }> =
    services.length > 0
      ? services.map((s) => ({
          loc:     `${siteUrl}/services/${s.slug}`,
          lastmod: SERVICE_PAGE_LASTMOD_DATE,
          name:    s.name,
        }))
      : SERVICE_SLUGS.map((slug) => ({
          loc:     `${siteUrl}/services/${slug}`,
          lastmod: SERVICE_PAGE_LASTMOD_DATE,
          name:    humanizeSlug(slug),
        }));

  if (entries.length === 0) return xmlUrlset("");

  // Include <image:image> entries so Google Images can index the branded OG
  // card for each service page, strengthening visual authority signals and
  // improving rich-result eligibility for fintech agency service queries.
  const body = entries
    .map((u) => {
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(u.name)}&category=${encodeURIComponent("Service")}`;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>0.8</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(u.name)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(u.loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(u.loc)}"/>\n` +
        `  </url>`
      );
    })
    .join("\n");

  return xmlUrlset(body, true);
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

/** Wrap a sitemap builder with the in-memory TTL cache. */
async function serveSitemap(
  key: string,
  builder: () => Promise<string>,
  res: import("express").Response,
): Promise<void> {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  const cached = getCachedSitemap(key);
  if (cached) {
    res.setHeader("X-Sitemap-Cache", "HIT");
    res.send(cached);
    return;
  }
  const xml = await builder();
  setCachedSitemap(key, xml);
  res.setHeader("X-Sitemap-Cache", "MISS");
  res.send(xml);
}

// ── /sitemap-tags.xml ────────────────────────────────────────────────────────
// One URL per unique tag derived from the blog_posts.tags JSONB column.
// Tag hub pages (/blog/tag/:slug) are generated from this set — keeping the
// sitemap in sync with the DB means no manual slug maintenance is needed.

async function buildTagsSitemapXml(): Promise<string> {
  const siteUrl = getSiteUrl();

  const rows = await db.execute<{ tag: string; lastmod: string }>(
    sql`
      SELECT
        tag,
        to_char(max(published_at), 'YYYY-MM-DD') as lastmod
      FROM (
        SELECT
          jsonb_array_elements_text(tags) as tag,
          published_at
        FROM blog_posts
        WHERE published_at <= now()
          AND no_index = false
      ) t
      WHERE tag IS NOT NULL AND tag <> ''
      GROUP BY tag
      ORDER BY tag ASC
    `,
  ).catch(() => ({ rows: [] as Array<{ tag: string; lastmod: string }> }));

  if (rows.rows.length === 0) return xmlUrlset("");

  const body = rows.rows
    .map((r) => {
      const slug    = r.tag.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!slug) return "";
      const loc     = `${siteUrl}/blog/tag/${slug}`;
      const label   = r.tag;
      const imageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(label)}&category=${encodeURIComponent("Tag")}`;
      const lastmod  = r.lastmod ?? new Date().toISOString().slice(0, 10);
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>0.6</priority>\n` +
        `    <image:image>\n` +
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n` +
        `      <image:title>${escapeXml(label)}</image:title>\n` +
        `    </image:image>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(loc)}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}"/>\n` +
        `  </url>`
      );
    })
    .filter(Boolean)
    .join("\n");

  return xmlUrlset(body, true);
}

router.get("/sitemap_index.xml",  (_req, res) => serveSitemap("sitemap_index",  buildSitemapIndexXml,   res));
router.get("/sitemap-pages.xml",  (_req, res) => serveSitemap("sitemap_pages",  buildPagesSitemapXml,   res));
router.get("/sitemap-blog.xml",   (_req, res) => serveSitemap("sitemap_blog",   buildBlogSitemapXml,    res));
router.get("/sitemap-tags.xml",   (_req, res) => serveSitemap("sitemap_tags",   buildTagsSitemapXml,    res));
router.get("/sitemap-authors.xml",(_req, res) => serveSitemap("sitemap_authors",buildAuthorsSitemapXml, res));
router.get("/sitemap-locations.xml",(_req, res) => serveSitemap("sitemap_locations", buildLocationsSitemapXml, res));
router.get("/sitemap-glossary.xml", (_req, res) => serveSitemap("sitemap_glossary",  buildGlossarySitemapXml,  res));
router.get("/sitemap-tools.xml",    (_req, res) => serveSitemap("sitemap_tools",     buildToolsSitemapXml,     res));
router.get("/sitemap-compare.xml",  (_req, res) => serveSitemap("sitemap_compare",   buildCompareSitemapXml,   res));
router.get("/sitemap-services.xml", (_req, res) => serveSitemap("sitemap_services",  buildServicesSitemapXml,  res));

export default router;
