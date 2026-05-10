/**
 * SSR meta-tag injection middleware — Hostinger production only.
 *
 * Problem: FintechPressHub is a React SPA. In production, Express serves the
 * pre-built index.html as a fallback for every non-API route. That means
 * Googlebot and social crawlers see the same generic <title>, <meta>, and
 * og:* tags for every URL before JavaScript executes.
 *
 * Solution: This middleware intercepts the request BEFORE the static-file
 * fallback, fetches minimal data from the database (or a static map), and
 * streams back a patched index.html with correct:
 *   - <title>
 *   - <meta name="description">
 *   - <link rel="canonical">
 *   - og:title / og:description / og:image / og:url / og:image:type
 *   - twitter:title / twitter:description / twitter:image
 *   - article:section / article:tag (blog posts)
 *   - Page-specific JSON-LD structured data
 *   - BreadcrumbList JSON-LD (all covered routes)
 *
 * This is only active in production (NODE_ENV === "production") and only when
 * the frontend dist directory exists, so development is completely unaffected.
 *
 * Covered dynamic routes:
 *   /blog/:slug            — BlogPosting schema (uses seoTitle/seoDescription overrides)
 *   /locations/:slug       — LocalBusiness schema
 *   /glossary/:slug        — DefinedTerm schema
 *   /services/:slug        — FinancialService schema
 *   /authors/:slug         — ProfilePage + Person schema
 *   /blog/category/:slug   — CollectionPage schema
 *   /compare/:slug         — FAQPage schema
 *   /tools/:slug           — SoftwareApplication schema
 *
 * Covered static pages:
 *   /, /about, /services, /pricing, /blog, /authors, /write-for-us,
 *   /editorial-guidelines, /community-guidelines, /tools, /glossary, /compare,
 *   /press, /contact, /privacy-policy, /refund-policy, /cookie-policy,
 *   /terms, /resources/fintech-publications
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

/**
 * Detect the og:image:type from a URL's file extension.
 * Defaults to image/jpeg which covers /api/og JPEG output and most CDN images.
 */
function resolveOgImageType(url: string): string {
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  if (/\.gif(\?|$)/i.test(url)) return "image/gif";
  return "image/jpeg";
}

interface MetaPatches {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  /** Explicit image MIME type override. Inferred from URL when omitted. */
  ogImageType?: string;
  ogType?: string;
  /** OG article:section meta tag value (blog posts). */
  articleSection?: string;
  /** OG article:tag meta tag values (blog posts). */
  articleTags?: string[];
  /**
   * Array of JSON-LD strings — each injected as its own
   * <script type="application/ld+json"> block before </head>.
   * Use an array instead of a single string so multiple schema types
   * (e.g. BlogPosting + BreadcrumbList) never end up nested inside one tag.
   */
  extraLds?: string[];
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

  // Patch og:image:type when the image format is not JPEG (e.g. Unsplash PNG,
  // CDN WebP). The index.html default is "image/jpeg" which is correct for the
  // /api/og endpoint; only override when actually different.
  const imageType = p.ogImageType ?? resolveOgImageType(p.ogImage);
  if (imageType !== "image/jpeg") {
    html = html.replace(
      /(<meta property="og:image:type" content=")[^"]*(")/,
      `$1${esc(imageType)}$2`,
    );
  }

  html = html.replace(/(<meta name="twitter:url" content=")[^"]*(")/,         `$1${esc(p.canonical)}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${esc(p.ogTitle)}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${esc(p.ogDescription)}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/,       `$1${esc(p.ogImage)}$2`);
  html = html.replace(/(<meta name="twitter:image:alt" content=")[^"]*(")/,    `$1${esc(p.ogImageAlt)}$2`);

  // Collect all injections (structured data + article meta) and insert
  // them as a block just before </head>. Order: JSON-LD first, then article
  // meta tags (which are not script blocks).
  const injections: string[] = [];

  if (p.extraLds && p.extraLds.length > 0) {
    for (const ld of p.extraLds) {
      injections.push(`  <script type="application/ld+json">\n${ld}\n  </script>`);
    }
  }

  if (p.articleSection) {
    injections.push(`  <meta property="article:section" content="${esc(p.articleSection)}" />`);
  }

  if (p.articleTags && p.articleTags.length > 0) {
    for (const tag of p.articleTags) {
      injections.push(`  <meta property="article:tag" content="${esc(tag)}" />`);
    }
  }

  if (injections.length > 0) {
    html = html.replace("</head>", injections.join("\n") + "\n</head>");
  }

  return html;
}

// ---------- helpers ----------

/**
 * Build a BreadcrumbList JSON-LD string from an ordered array of {name, url}
 * pairs. The first item is always Home; the last is the current page.
 */
function buildBreadcrumbLd(crumbs: Array<{ name: string; url: string }>): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    },
    null,
    2,
  );
}

/** Segment label map — mirrors BREADCRUMB_LABELS in the frontend. */
const SEGMENT_LABELS: Record<string, string> = {
  about: "About",
  services: "Services",
  pricing: "Pricing",
  blog: "Blog",
  authors: "Our Authors",
  tools: "Free Tools",
  press: "Press",
  glossary: "Glossary",
  compare: "Comparisons",
  resources: "Resources",
  category: "Category",
  contact: "Contact",
  "privacy-policy": "Privacy Policy",
  "refund-policy": "Refund Policy",
  "cookie-policy": "Cookie Policy",
  terms: "Terms",
  "editorial-guidelines": "Editorial Guidelines",
  "community-guidelines": "Community Guidelines",
  "write-for-us": "Write For Us",
  "fintech-publications": "Fintech Publications",
  locations: "Locations",
};

/**
 * Build breadcrumb items for a given path.
 * /blog/my-post  → [{Home}, {Blog}, {My Post}]
 * /about         → [{Home}, {About}]
 */
function buildCrumbsForPath(
  siteUrl: string,
  segments: string[],
  leafLabel: string,
): Array<{ name: string; url: string }> {
  const crumbs: Array<{ name: string; url: string }> = [
    { name: "Home", url: siteUrl },
  ];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLeaf = i === segments.length - 1;
    const label = isLeaf
      ? leafLabel
      : SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ name: label, url: `${siteUrl}${acc}` });
  });
  return crumbs;
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

/**
 * SSR meta for static marketing pages that aren't dynamically routed.
 * These mirror PAGE_META in the frontend (lib/metaData.ts) so crawlers
 * see correct, unique titles and descriptions for every high-priority page.
 * Fixing this once fixes all listed pages simultaneously.
 */
const STATIC_META: Record<string, { title: string; description: string; ogType?: string }> = {
  "/": {
    title: "FintechPressHub | Fintech SEO & Content Marketing Agency",
    description: "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results for ambitious fintech brands.",
    ogType: "website",
  },
  "/about": {
    title: "About FintechPressHub | Fintech SEO Agency",
    description: "FintechPressHub is a specialist fintech SEO agency built by operators who have worked inside payments, lending, and banking — not generalists learning on your account. Meet the team.",
  },
  "/services": {
    title: "Growth Engines for Fintech Brands | FintechPressHub",
    description: "Comprehensive fintech SEO, link building, and content marketing services built to compound organic growth.",
  },
  "/pricing": {
    title: "Transparent Fintech SEO Pricing | FintechPressHub",
    description: "Clear, retainer-based pricing for fintech SEO and content marketing — predictable costs with senior operators on every account.",
  },
  "/blog": {
    title: "Fintech SEO & Content Marketing Insights | FintechPressHub",
    description: "Strategy, SEO, and content marketing playbooks for fintech operators. Covering payments, embedded finance, open banking, neobanking, lending, regtech, and wealthtech.",
  },
  "/authors": {
    title: "Our Authors | Fintech SEO Specialists | FintechPressHub",
    description: "Meet the fintech SEO specialists, analysts, and content strategists who write for FintechPressHub — all with hands-on experience inside regulated financial services.",
  },
  "/write-for-us": {
    title: "Write For Us | FintechPressHub",
    description: "Pitch a guest article to FintechPressHub. We publish expert-level fintech, payments, and lending content for a 50,000+ monthly reader audience. Dofollow link included.",
  },
  "/editorial-guidelines": {
    title: "Editorial Guidelines | FintechPressHub",
    description: "The standards we hold our writers, guest contributors, and client deliverables to — accuracy, sourcing, AI usage, tone, and compliance.",
  },
  "/community-guidelines": {
    title: "Community Guidelines | FintechPressHub",
    description: "Standards of conduct, content quality, and IP expectations for every contributor and community participant on FintechPressHub.",
  },
  "/tools": {
    title: "Free Fintech Marketing Tools | FintechPressHub",
    description: "Free, browser-based tools for fintech marketers and SEO teams — calculators, generators, and checkers. No sign-up required.",
  },
  "/glossary": {
    title: "Fintech Glossary | Definitions for 100+ Terms | FintechPressHub",
    description: "Clear, jargon-free definitions for fintech terms — payments, lending, open banking, regtech, wealthtech, and more. Built for founders, marketers, and journalists.",
  },
  "/compare": {
    title: "Fintech SEO Agency Comparisons | FintechPressHub",
    description: "Detailed head-to-head comparisons of fintech SEO approaches — agency vs in-house, specialist vs generalist, content-led vs paid. Make an informed decision.",
  },
  "/press": {
    title: "Press & Media Kit | FintechPressHub",
    description: "Press resources for FintechPressHub — brand assets, company boilerplate, key stats, recent coverage, and press contact details for journalists and editors.",
  },
  "/contact": {
    title: "Contact Us | FintechPressHub",
    description: "Get in touch for a free SEO audit and strategy consultation. Specialist fintech SEO expertise, no generalist fluff.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | FintechPressHub",
    description: "How FintechPressHub collects, uses, and protects your personal information.",
  },
  "/refund-policy": {
    title: "Refund Policy | FintechPressHub",
    description: "Our approach to refunds, retainer cancellations, content revisions, and link replacement guarantees.",
  },
  "/cookie-policy": {
    title: "Cookie Policy | FintechPressHub",
    description: "How FintechPressHub uses cookies and similar technologies on this website.",
  },
  "/terms": {
    title: "Terms and Conditions | FintechPressHub",
    description: "The terms governing use of the FintechPressHub website and services.",
  },
  "/resources/fintech-publications": {
    title: "Top Fintech Publications & Media Outlets | FintechPressHub",
    description: "The definitive list of high-authority fintech publications, newsletters, and media outlets for link building and guest post outreach.",
  },
};

// ---------- route regexes (dynamic parameterised routes only) ----------
// Static pages are matched via exact path lookup in STATIC_META above.

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
          seoTitle:             blogPostsTable.seoTitle,
          excerpt:              blogPostsTable.excerpt,
          seoDescription:       blogPostsTable.seoDescription,
          coverImage:           blogPostsTable.coverImage,
          noIndex:              blogPostsTable.noIndex,
          publishedAt:          blogPostsTable.publishedAt,
          updatedAt:            blogPostsTable.updatedAt,
          lastMaterialUpdateAt: blogPostsTable.lastMaterialUpdateAt,
          author:               blogPostsTable.author,
          authorRole:           blogPostsTable.authorRole,
          category:             blogPostsTable.category,
          tags:                 blogPostsTable.tags,
          seoOgImage:           blogPostsTable.seoOgImage,
        })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.slug, slug))
        .limit(1);

      if (!post || post.noIndex) return next();
      if (post.publishedAt > new Date()) return next();

      // Respect admin-set SEO overrides; fall back to title/excerpt.
      const pageTitle   = post.seoTitle ?? post.title;
      const canonical   = `${siteUrl}/blog/${slug}`;
      const ogImage     = post.seoOgImage
        ? post.seoOgImage
        : post.coverImage
          ? post.coverImage.startsWith("http")
            ? post.coverImage
            : `${siteUrl}${post.coverImage}`
          : `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&category=${encodeURIComponent(post.category)}&author=${encodeURIComponent(post.author)}&authorRole=${encodeURIComponent(post.authorRole ?? "")}`;
      const description = (post.seoDescription ?? post.excerpt ?? `Read "${post.title}" on FintechPressHub.`).slice(0, 160);
      const dateModified = (post.lastMaterialUpdateAt ?? post.updatedAt).toISOString();
      const authorSlug   = post.author ? toAuthorSlug(post.author) : null;
      const authorUrl    = authorSlug ? `${siteUrl}/authors/${authorSlug}` : null;
      const tags         = Array.isArray(post.tags) ? (post.tags as string[]) : [];

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", slug], pageTitle);

      patches = {
        title:          `${pageTitle} | FintechPressHub`,
        description,
        canonical,
        ogTitle:        pageTitle,
        ogDescription:  description,
        ogImage,
        ogImageAlt:     pageTitle,
        ogType:         "article",
        articleSection: post.category || undefined,
        articleTags:    tags.length > 0 ? tags : undefined,
        extraLds: [
          JSON.stringify({
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
                    ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
                    ...(authorUrl ? { url: authorUrl, "@id": `${authorUrl}#person` } : {}),
                  },
                }
              : {}),
            ...(post.category ? { articleSection: post.category } : {}),
            ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
          }, null, 2),
          buildBreadcrumbLd(breadcrumbs),
        ],
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

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["locations", slug], loc.city);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       loc.headline,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `FintechPressHub — ${loc.city} Fintech SEO`,
        extraLds: [
          JSON.stringify({
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
          buildBreadcrumbLd(breadcrumbs),
        ],
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

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["glossary", slug], term.term);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       title,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${term.term} definition — FintechPressHub Fintech Glossary`,
        extraLds: [
          JSON.stringify({
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
          buildBreadcrumbLd(breadcrumbs),
        ],
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

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["services", slug], svc.name);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       svc.name,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${svc.name} — FintechPressHub`,
        extraLds: [
          JSON.stringify({
            "@context":   "https://schema.org",
            // FinancialService is a more precise subtype for fintech/financial
            // services — it helps Google's Knowledge Graph classify the offering
            // correctly and improves LLM entity recognition.
            "@type":      "FinancialService",
            "@id":        canonical,
            name:         svc.name,
            description:  svc.tagline ?? svc.description ?? svc.name,
            url:          canonical,
            provider:     { "@id": `${siteUrl}#organization` },
          }, null, 2),
          buildBreadcrumbLd(breadcrumbs),
        ],
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

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["authors", slug], author.name);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       title,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${author.name}, ${author.role} at FintechPressHub`,
        ogType:        "profile",
        extraLds: [
          JSON.stringify({
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
          buildBreadcrumbLd(breadcrumbs),
        ],
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
      const leafLabel   = catMeta.title.replace(" | FintechPressHub", "");

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", "category", slug], leafLabel);

      patches = {
        title:         catMeta.title,
        description:   catMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: catMeta.description,
        ogImage,
        ogImageAlt:    catMeta.title,
        extraLds: [
          JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            name:        catMeta.title,
            description: catMeta.description,
            url:         canonical,
            isPartOf:    { "@id": `${siteUrl}/blog` },
            publisher:   { "@id": `${siteUrl}#organization` },
          }, null, 2),
          buildBreadcrumbLd(breadcrumbs),
        ],
      };
    }

    // ── /compare/:slug ───────────────────────────────────────────────────────
    const compareMatch = COMPARE_RE.exec(reqPath);
    if (compareMatch) {
      const slug     = compareMatch[1]!;
      const cmpMeta  = COMPARISON_META[slug];
      if (!cmpMeta) return next();

      const canonical  = `${siteUrl}/compare/${slug}`;
      const leafLabel  = cmpMeta.title.split("|")[0]!.trim();
      const breadcrumbs = buildCrumbsForPath(siteUrl, ["compare", slug], leafLabel);

      // FAQPage schema enables FAQ rich results for comparison queries.
      // The primary comparison question is structured as a Q&A so Google can
      // surface a featured snippet directly from this schema.
      patches = {
        title:         cmpMeta.title,
        description:   cmpMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: cmpMeta.description,
        ogImage:       `${siteUrl}/opengraph.jpg`,
        ogImageAlt:    leafLabel,
        extraLds: [
          JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "FAQPage",
            "@id":      canonical,
            name:       cmpMeta.title,
            url:        canonical,
            publisher:  { "@id": `${siteUrl}#organization` },
            mainEntity: [
              {
                "@type": "Question",
                name:    leafLabel,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    cmpMeta.description,
                },
              },
            ],
          }, null, 2),
          buildBreadcrumbLd(breadcrumbs),
        ],
      };
    }

    // ── /tools/:slug ─────────────────────────────────────────────────────────
    const toolsMatch = TOOLS_RE.exec(reqPath);
    if (toolsMatch) {
      const slug     = toolsMatch[1]!;
      const toolMeta = TOOLS_META[slug];
      if (!toolMeta) return next();

      const canonical  = `${siteUrl}/tools/${slug}`;
      const leafLabel  = toolMeta.title.split("|")[0]!.trim();
      const breadcrumbs = buildCrumbsForPath(siteUrl, ["tools", slug], leafLabel);

      patches = {
        title:         toolMeta.title,
        description:   toolMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: toolMeta.description,
        ogImage:       `${siteUrl}/api/og?title=${encodeURIComponent(leafLabel)}&type=tool`,
        ogImageAlt:    leafLabel,
        extraLds: [
          JSON.stringify({
            "@context":           "https://schema.org",
            "@type":              "SoftwareApplication",
            "@id":                canonical,
            name:                 leafLabel,
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
          buildBreadcrumbLd(breadcrumbs),
        ],
      };
    }

    // ── Static pages ─────────────────────────────────────────────────────────
    // Matches exact paths like /, /about, /pricing, /blog, /glossary, etc.
    // Runs after dynamic routes so a slug-based route always wins.
    if (!patches) {
      const staticMeta = STATIC_META[reqPath];
      if (staticMeta) {
        const canonical   = `${siteUrl}${reqPath === "/" ? "/" : reqPath}`;
        const ogImage     = `${siteUrl}/opengraph.jpg`;
        const segments    = reqPath === "/" ? [] : reqPath.split("/").filter(Boolean);
        const leafLabel   = staticMeta.title.split("|")[0]!.trim();
        const breadcrumbs = buildCrumbsForPath(siteUrl, segments, leafLabel);

        const extraLds: string[] = [
          JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        canonical,
            url:          canonical,
            name:         staticMeta.title,
            description:  staticMeta.description,
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
          }, null, 2),
        ];

        // Only emit BreadcrumbList when there is more than just Home.
        if (breadcrumbs.length > 1) {
          extraLds.push(buildBreadcrumbLd(breadcrumbs));
        }

        patches = {
          title:         staticMeta.title,
          description:   staticMeta.description,
          canonical,
          ogTitle:       leafLabel,
          ogDescription: staticMeta.description,
          ogImage,
          ogImageAlt:    "FintechPressHub - Fintech SEO Agency",
          ogType:        staticMeta.ogType,
          extraLds,
        };
      }
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

  const matchesDynamicRoute =
    BLOG_RE.test(reqPath) ||
    LOCATION_RE.test(reqPath) ||
    GLOSSARY_RE.test(reqPath) ||
    SERVICE_RE.test(reqPath) ||
    AUTHOR_RE.test(reqPath) ||
    CATEGORY_RE.test(reqPath) ||
    COMPARE_RE.test(reqPath) ||
    TOOLS_RE.test(reqPath);

  const isStaticPage = reqPath in STATIC_META;

  if (!matchesDynamicRoute && !isStaticPage) return next();

  const baseHtml = getBaseHtml();
  if (!baseHtml) return next();

  handleSsrMeta(req, res, next, baseHtml).catch(next);
}
