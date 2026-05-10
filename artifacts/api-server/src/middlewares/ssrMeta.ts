/**
 * SSR meta-tag injection middleware — Hostinger production only.
 *
 * Problem: FintechPressHub is a React SPA. In production, Express serves the
 * pre-built index.html as a fallback for every non-API route. That means
 * Googlebot and social crawlers see the same generic <title>, <meta>, and
 * og:* tags for every URL — blog posts, location pages, glossary terms all
 * look identical to a crawler before JavaScript executes.
 *
 * Solution: For key programmatic-SEO route patterns, this middleware intercepts
 * the request BEFORE the static-file fallback, fetches the minimal data needed
 * from the database, and streams back a patched index.html with correct:
 *   - <title>
 *   - <meta name="description">
 *   - <link rel="canonical">
 *   - og:title / og:description / og:image / og:url
 *   - twitter:title / twitter:description / twitter:image
 *   - Page-specific JSON-LD structured data
 *
 * This is only active in production (NODE_ENV === "production") and only when
 * the frontend dist directory exists, so development is completely unaffected.
 *
 * Covered routes:
 *   /blog/:slug         — BlogPosting schema
 *   /locations/:slug    — LocalBusiness schema
 *   /glossary/:slug     — DefinedTerm schema
 */

import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import type { Request, Response, NextFunction } from "express";
import { db, blogPostsTable, locationPagesTable, glossaryTermsTable } from "@workspace/db";
import { eq, lte, sql } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";

const _frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fintechpresshub/dist/public",
);

let _cachedHtml: string | null = null;

function getBaseHtml(): string | null {
  if (_cachedHtml) return _cachedHtml;
  const indexPath = path.join(_frontendDist, "index.html");
  if (!existsSync(indexPath)) return null;
  _cachedHtml = readFileSync(indexPath, "utf-8");
  return _cachedHtml;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface MetaPatches {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogType?: string;
  extraLd?: string;
}

function patchHtml(base: string, p: MetaPatches): string {
  let html = base;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`);
  html = html.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${esc(p.description)}$2`,
  );
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(")/,
    `$1${esc(p.canonical)}$2`,
  );

  if (p.ogType) {
    html = html.replace(
      /(<meta property="og:type" content=")[^"]*(")/,
      `$1${esc(p.ogType)}$2`,
    );
  }
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/,         `$1${esc(p.canonical)}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/,       `$1${esc(p.ogTitle)}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${esc(p.ogDescription)}$2`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/,       `$1${esc(p.ogImage)}$2`);
  html = html.replace(/(<meta property="og:image:secure_url" content=")[^"]*(")/,  `$1${esc(p.ogImage)}$2`);
  html = html.replace(/(<meta property="og:image:alt" content=")[^"]*(")/,    `$1${esc(p.ogImageAlt)}$2`);

  html = html.replace(/(<meta name="twitter:url" content=")[^"]*(")/,         `$1${esc(p.canonical)}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${esc(p.ogTitle)}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${esc(p.ogDescription)}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/,       `$1${esc(p.ogImage)}$2`);
  html = html.replace(/(<meta name="twitter:image:alt" content=")[^"]*(")/,    `$1${esc(p.ogImageAlt)}$2`);

  if (p.extraLd) {
    html = html.replace(
      "</head>",
      `  <script type="application/ld+json">\n${p.extraLd}\n  </script>\n</head>`,
    );
  }

  return html;
}

const BLOG_RE     = /^\/blog\/([^/]+)$/;
const LOCATION_RE = /^\/locations\/([^/]+)$/;
const GLOSSARY_RE = /^\/glossary\/([^/]+)$/;

async function handleSsrMeta(
  req: Request,
  res: Response,
  next: NextFunction,
  baseHtml: string,
): Promise<void> {
  const siteUrl = getSiteUrl();
  const reqPath = req.path;

  try {
    let patches: MetaPatches | null = null;

    const blogMatch = BLOG_RE.exec(reqPath);
    if (blogMatch) {
      const slug = blogMatch[1]!;
      const [post] = await db
        .select({
          title: blogPostsTable.title,
          excerpt: blogPostsTable.excerpt,
          coverImage: blogPostsTable.coverImage,
          noIndex: blogPostsTable.noIndex,
          publishedAt: blogPostsTable.publishedAt,
          author: blogPostsTable.author,
          category: blogPostsTable.category,
        })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.slug, slug))
        .limit(1);

      if (!post || post.noIndex) return next();
      if (post.publishedAt > new Date()) return next();

      const canonical  = `${siteUrl}/blog/${slug}`;
      const ogImage    = post.coverImage
        ? post.coverImage.startsWith("http")
          ? post.coverImage
          : `${siteUrl}${post.coverImage}`
        : `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&type=blog`;
      const description = (post.excerpt ?? `Read "${post.title}" on FintechPressHub.`).slice(0, 160);

      patches = {
        title:         `${post.title} | FintechPressHub`,
        description,
        canonical,
        ogTitle:       post.title,
        ogDescription: description,
        ogImage,
        ogImageAlt:    post.title,
        ogType:        "article",
        extraLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "BlogPosting",
          "@id":      canonical,
          headline:   post.title,
          description,
          url:        canonical,
          image:      ogImage,
          publisher:  { "@id": `${siteUrl}#organization` },
          ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
          ...(post.author ? { author: { "@type": "Person", name: post.author } } : {}),
        }, null, 2),
      };
    }

    const locationMatch = LOCATION_RE.exec(reqPath);
    if (locationMatch) {
      const slug = locationMatch[1]!;
      const [loc] = await db
        .select({
          city:        locationPagesTable.city,
          region:      locationPagesTable.region,
          country:     locationPagesTable.country,
          countryCode: locationPagesTable.countryCode,
          headline:    locationPagesTable.headline,
        })
        .from(locationPagesTable)
        .where(eq(locationPagesTable.slug, slug))
        .limit(1);

      if (!loc) return next();

      const canonical    = `${siteUrl}/locations/${slug}`;
      const locationLabel = loc.region
        ? `${loc.city}, ${loc.region}, ${loc.country}`
        : `${loc.city}, ${loc.country}`;
      const description  = `FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`.slice(0, 160);
      const title        = `${loc.headline} | FintechPressHub`;
      const ogImage      = `${siteUrl}/api/og?title=${encodeURIComponent(loc.headline)}&type=service`;

      patches = {
        title,
        description,
        canonical,
        ogTitle:       loc.headline,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `FintechPressHub — ${loc.city} Fintech SEO`,
        extraLd: JSON.stringify({
          "@context":       "https://schema.org",
          "@type":          "LocalBusiness",
          "@id":            canonical,
          name:             `FintechPressHub — ${loc.city} Fintech SEO`,
          description:      loc.headline,
          url:              canonical,
          addressLocality:  loc.city,
          addressCountry:   loc.countryCode,
          publisher:        { "@id": `${siteUrl}#organization` },
        }, null, 2),
      };
    }

    const glossaryMatch = GLOSSARY_RE.exec(reqPath);
    if (glossaryMatch) {
      const slug = glossaryMatch[1]!;
      const [term] = await db
        .select({
          term:     glossaryTermsTable.term,
          shortDef: glossaryTermsTable.shortDef,
          category: glossaryTermsTable.category,
        })
        .from(glossaryTermsTable)
        .where(eq(glossaryTermsTable.slug, slug))
        .limit(1);

      if (!term) return next();

      const canonical   = `${siteUrl}/glossary/${slug}`;
      const description = term.shortDef.slice(0, 160);
      const title       = `${term.term} — Fintech Glossary | FintechPressHub`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(term.term)}&type=glossary`;

      patches = {
        title,
        description,
        canonical,
        ogTitle:       title,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${term.term} definition — FintechPressHub Fintech Glossary`,
        extraLd: JSON.stringify({
          "@context":   "https://schema.org",
          "@type":      "DefinedTerm",
          "@id":        canonical,
          name:         term.term,
          description:  term.shortDef,
          url:          canonical,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name:    "Fintech Glossary",
            url:     `${siteUrl}/glossary`,
          },
          ...(term.category ? { subjectOf: { "@type": "Thing", name: term.category } } : {}),
        }, null, 2),
      };
    }

    if (!patches) return next();

    const html = patchHtml(baseHtml, patches);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.send(html);
    }
  } catch {
    next();
  }
}

export function ssrMetaMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== "production") return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const reqPath = req.path;
  if (
    !BLOG_RE.test(reqPath) &&
    !LOCATION_RE.test(reqPath) &&
    !GLOSSARY_RE.test(reqPath)
  ) {
    return next();
  }

  const baseHtml = getBaseHtml();
  if (!baseHtml) return next();

  handleSsrMeta(req, res, next, baseHtml).catch(next);
}
