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
 *   /blog/:slug            — BlogPosting schema (dateModified + author url)
 *   /locations/:slug       — LocalBusiness schema (with addressRegion)
 *   /glossary/:slug        — DefinedTerm schema
 *   /services/:slug        — Service schema
 *   /authors/:slug         — ProfilePage + Person schema
 *   /blog/category/:slug   — ItemList schema for category hub pages
 *   /compare/:slug         — FAQPage schema for comparison pages
 *   /tools/:slug           — SoftwareApplication schema for tool pages
 */

import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import type { Request, Response, NextFunction } from "express";
import {
  db,
  blogPostsTable,
  locationPagesTable,
  glossaryTermsTable,
  servicesTable,
  authorsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
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

/** Convert an author display name to the slug used in /authors/:slug URLs. */
function toAuthorSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

// ---------- static meta lookups (no DB needed) ----------

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  payments: {
    title: "Payments Articles | FintechPressHub",
    description: "Expert analysis and guides on payment infrastructure, card issuing, cross-border rails, and payment orchestration for fintech teams.",
  },
  "embedded-finance": {
    title: "Embedded Finance Articles | FintechPressHub",
    description: "Deep dives into BaaS architecture, embedded lending, and vertical SaaS payments powering the next wave of fintech products.",
  },
  "open-banking": {
    title: "Open Banking Articles | FintechPressHub",
    description: "Coverage of PSD3, account-to-account payments, variable recurring payments, and open data compliance for regulated fintechs.",
  },
  neobanking: {
    title: "Neobanking Articles | FintechPressHub",
    description: "Strategies and analysis for digital banks on activation, retention, fee economics, and regulatory positioning.",
  },
  lending: {
    title: "Lending Articles | FintechPressHub",
    description: "Insights on BNPL, SME lending, cash-flow underwriting, embedded credit, and consumer affordability for lending fintechs.",
  },
  regtech: {
    title: "Regtech & Compliance Articles | FintechPressHub",
    description: "Expert guides on transaction monitoring, reg reporting, sanctions screening, and KYC/AML tooling.",
  },
  wealthtech: {
    title: "Wealthtech Articles | FintechPressHub",
    description: "Analysis of robo-advisors, portfolio construction, advisor SaaS marketing, and self-directed investing platforms.",
  },
  "fintech-seo": {
    title: "Fintech SEO Articles | FintechPressHub",
    description: "Actionable SEO guides, content strategy, and link-building playbooks specifically for fintech and financial services companies.",
  },
};

const COMPARISON_META: Record<string, { title: string; description: string }> = {
  "agency-vs-in-house": {
    title: "Fintech SEO Agency vs Generic Agency vs In-House | FintechPressHub",
    description: "Compare a fintech SEO specialist, a generic digital agency, and an in-house team across 10 criteria that matter most for regulated financial companies.",
  },
  "vs-freelancers": {
    title: "Fintech SEO Agency vs Freelance Writers vs Consultants | FintechPressHub",
    description: "Compare FintechPressHub with freelance fintech writers and independent SEO consultants. See which model delivers better ROI, consistency, and compliance coverage.",
  },
  "vs-seo-tools": {
    title: "Fintech SEO Agency vs DIY SEO Tools | FintechPressHub",
    description: "Compare using a managed fintech SEO agency against running your own SEO stack with Ahrefs, Semrush, and similar tools.",
  },
  "vs-pr-agencies": {
    title: "Fintech SEO Agency vs PR Agencies | FintechPressHub",
    description: "SEO-focused fintech agency versus a traditional PR firm — understanding the difference in strategy, metrics, and organic growth outcomes.",
  },
  "content-led-vs-paid": {
    title: "Content-Led SEO vs Paid Search for Fintech | FintechPressHub",
    description: "Content-led organic SEO versus paid search (Google Ads, LinkedIn) for fintech growth — a detailed breakdown of cost, scalability, and compounding returns.",
  },
  "specialist-vs-generalist": {
    title: "Specialist vs Generalist SEO Agency for Fintech | FintechPressHub",
    description: "Why fintech companies consistently outperform with a specialist SEO agency versus a generalist digital marketing firm.",
  },
};

const TOOLS_META: Record<string, { title: string; description: string }> = {
  "financial-health-score-calculator": {
    title: "Financial Health Score Calculator | FintechPressHub",
    description: "Free Financial Health Score Calculator. Get your 0–100 score instantly with a debt-to-income ratio check, savings rate, emergency fund coverage, and personalised tips.",
  },
  "meta-description-generator": {
    title: "Meta Description Generator | Free SEO Tool | FintechPressHub",
    description: "Generate 3 ready-to-use SEO meta descriptions for any professional page. Enter your page title and target keyword to get started.",
  },
  "guest-post-pitch-generator": {
    title: "Guest Post Pitch Generator | Free Link Building Tool | FintechPressHub",
    description: "Create a compelling, personalised guest post pitch email in seconds. Fill in a few details about your company and target publication.",
  },
  "readability-checker": {
    title: "Readability Checker | Free Content Tool | FintechPressHub",
    description: "Paste your article and get an instant Flesch readability score, grade level, sentence length breakdown, and actionable tips.",
  },
  "keyword-difficulty-estimator": {
    title: "Keyword Difficulty Estimator | Free SEO Tool | FintechPressHub",
    description: "Estimate keyword difficulty and find quick-win opportunities for your fintech content strategy.",
  },
  "backlink-value-estimator": {
    title: "Backlink Value Estimator | Free Link Building Tool | FintechPressHub",
    description: "Estimate the SEO value of a backlink opportunity before you invest time in outreach.",
  },
  "content-brief-generator": {
    title: "Content Brief Generator | Free SEO Tool | FintechPressHub",
    description: "Generate a comprehensive content brief for any fintech topic in seconds.",
  },
  "headline-analyzer": {
    title: "Headline Analyzer | Free SEO Tool | FintechPressHub",
    description: "Analyse your article headline for SEO power, emotional impact, readability, and click-worthiness.",
  },
  "link-prospector": {
    title: "Link Prospector | Free Fintech Link Building Tool | FintechPressHub",
    description: "Paste a list of domains to bulk-score your backlink prospects — then rank them by highest value or easiest win for your outreach plan.",
  },
  "outreach-email-generator": {
    title: "Outreach Email Generator | Free Fintech Link Building Tool | FintechPressHub",
    description: "Generate a personalised link-building outreach email in seconds. Choose your tone, fill in the details, and compare subject line variants.",
  },
};

// ---------- route regexes ----------

const BLOG_RE     = /^\/blog\/([^/]+)$/;
const LOCATION_RE = /^\/locations\/([^/]+)$/;
const GLOSSARY_RE = /^\/glossary\/([^/]+)$/;
const SERVICE_RE  = /^\/services\/([^/]+)$/;
const AUTHOR_RE   = /^\/authors\/([^/]+)$/;
const CATEGORY_RE = /^\/blog\/category\/([^/]+)$/;
const COMPARE_RE  = /^\/compare\/([^/]+)$/;
const TOOLS_RE    = /^\/tools\/([^/]+)$/;

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

    // ── /blog/:slug ──────────────────────────────────────────────────────────
    const blogMatch = BLOG_RE.exec(reqPath);
    if (blogMatch) {
      const slug = blogMatch[1]!;
      const [post] = await db
        .select({
          title:                blogPostsTable.title,
          excerpt:              blogPostsTable.excerpt,
          coverImage:           blogPostsTable.coverImage,
          noIndex:              blogPostsTable.noIndex,
          publishedAt:          blogPostsTable.publishedAt,
          updatedAt:            blogPostsTable.updatedAt,
          lastMaterialUpdateAt: blogPostsTable.lastMaterialUpdateAt,
          author:               blogPostsTable.author,
          category:             blogPostsTable.category,
          seoOgImage:           blogPostsTable.seoOgImage,
        })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.slug, slug))
        .limit(1);

      if (!post || post.noIndex) return next();
      if (post.publishedAt > new Date()) return next();

      const canonical   = `${siteUrl}/blog/${slug}`;
      const ogImage     = post.seoOgImage
        ? post.seoOgImage
        : post.coverImage
          ? post.coverImage.startsWith("http")
            ? post.coverImage
            : `${siteUrl}${post.coverImage}`
          : `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&type=blog`;
      const description = (post.excerpt ?? `Read "${post.title}" on FintechPressHub.`).slice(0, 160);
      const dateModified = (post.lastMaterialUpdateAt ?? post.updatedAt).toISOString();
      const authorSlug   = post.author ? toAuthorSlug(post.author) : null;
      const authorUrl    = authorSlug ? `${siteUrl}/authors/${authorSlug}` : null;

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
          datePublished: post.publishedAt.toISOString(),
          dateModified,
          ...(post.author
            ? {
                author: {
                  "@type":    "Person",
                  name:       post.author,
                  ...(authorUrl ? { url: authorUrl, "@id": `${authorUrl}#person` } : {}),
                },
              }
            : {}),
          ...(post.category ? { articleSection: post.category } : {}),
        }, null, 2),
      };
    }

    // ── /locations/:slug ─────────────────────────────────────────────────────
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

      const canonical     = `${siteUrl}/locations/${slug}`;
      const locationLabel = loc.region
        ? `${loc.city}, ${loc.region}, ${loc.country}`
        : `${loc.city}, ${loc.country}`;
      const description   = `FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`.slice(0, 160);
      const title         = `${loc.headline} | FintechPressHub`;
      const ogImage       = `${siteUrl}/api/og?title=${encodeURIComponent(loc.headline)}&type=service`;

      patches = {
        title,
        description,
        canonical,
        ogTitle:       loc.headline,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `FintechPressHub — ${loc.city} Fintech SEO`,
        extraLd: JSON.stringify({
          "@context":      "https://schema.org",
          "@type":         "LocalBusiness",
          "@id":           canonical,
          name:            `FintechPressHub — ${loc.city} Fintech SEO`,
          description:     loc.headline,
          url:             canonical,
          address: {
            "@type":          "PostalAddress",
            addressLocality:  loc.city,
            ...(loc.region ? { addressRegion: loc.region } : {}),
            addressCountry:   loc.countryCode,
          },
          areaServed: { "@type": "Place", name: loc.country },
          publisher:   { "@id": `${siteUrl}#organization` },
        }, null, 2),
      };
    }

    // ── /glossary/:slug ──────────────────────────────────────────────────────
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

    // ── /services/:slug ──────────────────────────────────────────────────────
    const serviceMatch = SERVICE_RE.exec(reqPath);
    if (serviceMatch) {
      const slug = serviceMatch[1]!;
      const [svc] = await db
        .select({
          name:        servicesTable.name,
          tagline:     servicesTable.tagline,
          description: servicesTable.description,
        })
        .from(servicesTable)
        .where(eq(servicesTable.slug, slug))
        .limit(1);

      if (!svc) return next();

      const canonical   = `${siteUrl}/services/${slug}`;
      const description = (svc.tagline ?? svc.description ?? `${svc.name} — FintechPressHub`).slice(0, 160);
      const title       = `${svc.name} | FintechPressHub`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(svc.name)}&type=service`;

      patches = {
        title,
        description,
        canonical,
        ogTitle:       svc.name,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${svc.name} — FintechPressHub`,
        extraLd: JSON.stringify({
          "@context":   "https://schema.org",
          "@type":      "Service",
          "@id":        canonical,
          name:         svc.name,
          description:  svc.tagline ?? svc.description ?? svc.name,
          url:          canonical,
          provider:     { "@id": `${siteUrl}#organization` },
        }, null, 2),
      };
    }

    // ── /authors/:slug ───────────────────────────────────────────────────────
    const authorMatch = AUTHOR_RE.exec(reqPath);
    if (authorMatch) {
      const slug = authorMatch[1]!;
      const [author] = await db
        .select({
          name:     authorsTable.name,
          role:     authorsTable.role,
          shortBio: authorsTable.shortBio,
          photo:    authorsTable.photo,
          social:   authorsTable.social,
        })
        .from(authorsTable)
        .where(eq(authorsTable.slug, slug))
        .limit(1);

      if (!author) return next();

      const canonical   = `${siteUrl}/authors/${slug}`;
      const description = author.shortBio.slice(0, 160);
      const title       = `${author.name} — ${author.role} | FintechPressHub`;
      const ogImage     = author.photo
        ? author.photo.startsWith("http")
          ? author.photo
          : `${siteUrl}${author.photo}`
        : `${siteUrl}/opengraph.jpg`;
      const social = (author.social ?? {}) as { linkedin?: string; twitter?: string; website?: string };

      patches = {
        title,
        description,
        canonical,
        ogTitle:       title,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${author.name}, ${author.role} at FintechPressHub`,
        ogType:        "profile",
        extraLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "ProfilePage",
          "@id":      canonical,
          url:        canonical,
          mainEntity: {
            "@type":      "Person",
            "@id":        `${canonical}#person`,
            name:         author.name,
            jobTitle:     author.role,
            description:  author.shortBio,
            url:          canonical,
            image:        ogImage,
            worksFor:     { "@id": `${siteUrl}#organization` },
            sameAs: [social.linkedin, social.twitter, social.website].filter(Boolean),
          },
        }, null, 2),
      };
    }

    // ── /blog/category/:slug ─────────────────────────────────────────────────
    const categoryMatch = CATEGORY_RE.exec(reqPath);
    if (categoryMatch) {
      const slug    = categoryMatch[1]!;
      const catMeta = CATEGORY_META[slug];
      if (!catMeta) return next();

      const canonical   = `${siteUrl}/blog/category/${slug}`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(catMeta.title.replace(" | FintechPressHub", ""))}&type=blog`;

      patches = {
        title:         catMeta.title,
        description:   catMeta.description,
        canonical,
        ogTitle:       catMeta.title.replace(" | FintechPressHub", ""),
        ogDescription: catMeta.description,
        ogImage,
        ogImageAlt:    catMeta.title,
        extraLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "CollectionPage",
          "@id":      canonical,
          name:       catMeta.title,
          description: catMeta.description,
          url:        canonical,
          isPartOf:   { "@id": `${siteUrl}/blog` },
          publisher:  { "@id": `${siteUrl}#organization` },
        }, null, 2),
      };
    }

    // ── /compare/:slug ───────────────────────────────────────────────────────
    const compareMatch = COMPARE_RE.exec(reqPath);
    if (compareMatch) {
      const slug     = compareMatch[1]!;
      const cmpMeta  = COMPARISON_META[slug];
      if (!cmpMeta) return next();

      const canonical = `${siteUrl}/compare/${slug}`;

      patches = {
        title:         cmpMeta.title,
        description:   cmpMeta.description,
        canonical,
        ogTitle:       cmpMeta.title.split("|")[0].trim(),
        ogDescription: cmpMeta.description,
        ogImage:       `${siteUrl}/opengraph.jpg`,
        ogImageAlt:    cmpMeta.title.split("|")[0].trim(),
        extraLd: JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "WebPage",
          "@id":      canonical,
          name:       cmpMeta.title,
          description: cmpMeta.description,
          url:        canonical,
          isPartOf:   { "@id": `${siteUrl}/compare` },
          publisher:  { "@id": `${siteUrl}#organization` },
        }, null, 2),
      };
    }

    // ── /tools/:slug ─────────────────────────────────────────────────────────
    const toolsMatch = TOOLS_RE.exec(reqPath);
    if (toolsMatch) {
      const slug     = toolsMatch[1]!;
      const toolMeta = TOOLS_META[slug];
      if (!toolMeta) return next();

      const canonical = `${siteUrl}/tools/${slug}`;

      patches = {
        title:         toolMeta.title,
        description:   toolMeta.description,
        canonical,
        ogTitle:       toolMeta.title.split("|")[0].trim(),
        ogDescription: toolMeta.description,
        ogImage:       `${siteUrl}/api/og?title=${encodeURIComponent(toolMeta.title.split("|")[0].trim())}&type=tool`,
        ogImageAlt:    toolMeta.title.split("|")[0].trim(),
        extraLd: JSON.stringify({
          "@context":           "https://schema.org",
          "@type":              "SoftwareApplication",
          "@id":                canonical,
          name:                 toolMeta.title.split("|")[0].trim(),
          description:          toolMeta.description,
          url:                  canonical,
          applicationCategory:  "WebApplication",
          operatingSystem:      "Web",
          offers: {
            "@type":        "Offer",
            price:          "0",
            priceCurrency:  "USD",
          },
          provider: { "@id": `${siteUrl}#organization` },
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
    !GLOSSARY_RE.test(reqPath) &&
    !SERVICE_RE.test(reqPath) &&
    !AUTHOR_RE.test(reqPath) &&
    !CATEGORY_RE.test(reqPath) &&
    !COMPARE_RE.test(reqPath) &&
    !TOOLS_RE.test(reqPath)
  ) {
    return next();
  }

  const baseHtml = getBaseHtml();
  if (!baseHtml) return next();

  handleSsrMeta(req, res, next, baseHtml).catch(next);
}
