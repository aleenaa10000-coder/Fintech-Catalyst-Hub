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
 *   /blog/tag/:slug        — CollectionPage schema
 *   /compare/:slug         — FAQPage schema
 *   /tools/:slug           — SoftwareApplication schema
 *
 * Covered static pages:
 *   /, /about, /services, /pricing, /blog, /authors, /write-for-us,
 *   /editorial-guidelines, /community-guidelines, /tools, /glossary, /compare,
 *   /press, /contact, /privacy-policy, /refund-policy, /cookie-policy,
 *   /terms, /resources/fintech-publications, /locations
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
  pricingPlansTable,
  pressMentionsTable,
  testimonialsTable,
} from "@workspace/db";
import { eq, lte, sql, desc, asc } from "drizzle-orm";
import { getSiteUrl } from "../lib/seo";
import { BREADCRUMB_LABELS, SERVICE_PAGE_LASTMOD_DATE, TOOL_PAGE_LASTMOD, COMPARE_PAGE_LASTMOD } from "../lib/seoConstants";

// Resolve the frontend dist directory. The relative path differs between:
//   Replit monorepo:  artifacts/api-server/dist/ → artifacts/fintechpresshub/dist/public/
//   Hostinger/flat:  api-server/dist/            → fintechpresshub/dist/public/
// We probe both candidates and use whichever exists, so the same build works
// in both environments without any per-environment configuration.
const _frontendDist = (() => {
  const base = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(base, "../../fintechpresshub/dist/public"),   // Replit: artifacts/ prefix
    path.resolve(base, "../../../fintechpresshub/dist/public"), // Hostinger: flat layout
  ];
  return candidates.find((p) => existsSync(path.join(p, "index.html"))) ?? candidates[0];
})();

let _cachedHtml: string | null = null;

function getBaseHtml(): string | null {
  if (_cachedHtml) return _cachedHtml;
  const indexPath = path.join(_frontendDist, "index.html");
  if (!existsSync(indexPath)) return null;
  let html = readFileSync(indexPath, "utf-8");
  // Inject Google Search Console verification tag from the GOOGLE_SITE_VERIFICATION
  // env var when set. Replaces the commented-out placeholder in index.html so the
  // token is never hardcoded in source control and can be activated on any
  // environment without a code deploy.
  const gscToken = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (gscToken) {
    html = html.replace(
      /<!--\s*<meta name="google-site-verification"[^>]*>\s*-->/,
      `<meta name="google-site-verification" content="${gscToken}" />`,
    );
  }
  _cachedHtml = html;
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
  /** Explicit og:image:width override (pixels). Default 1200 from index.html. */
  ogImageWidth?: number;
  /** Explicit og:image:height override (pixels). Default 630 from index.html. */
  ogImageHeight?: number;
  ogType?: string;
  /** OG article:section meta tag value (blog posts). */
  articleSection?: string;
  /** OG article:tag meta tag values (blog posts). */
  articleTags?: string[];
  /** OG article:published_time (blog posts — ISO 8601). */
  articlePublishedTime?: string;
  /** OG article:modified_time (blog posts — ISO 8601). */
  articleModifiedTime?: string;
  /** OG article:author display name (kept for twitter/fallback rendering). */
  articleAuthor?: string;
  /**
   * OG article:author profile URL (preferred for article:author per the Open
   * Graph spec — Facebook, LinkedIn, and Google all prefer a profile URL here
   * rather than a plain display name). Emitted when the author has a profile
   * page at /authors/:slug. Falls back to display name string when absent.
   */
  articleAuthorUrl?: string;
  /** twitter:creator tag (blog posts — author's Twitter @handle). */
  twitterCreator?: string;
  /**
   * HTML <meta name="author"> value — author display name for blog posts.
   * Understood by search engines as a page-level authorship signal that
   * supplements the JSON-LD Person entity and article:author OG tag.
   */
  author?: string;
  /**
   * OG article:publisher URL — the organisation's primary social profile URL.
   * Injected on article pages so Facebook/LinkedIn can attribute the content
   * to FintechPressHub and surface the org in social previews. Supplements
   * the per-article article:author tag which points to the individual writer.
   */
  articlePublisher?: string;
  /**
   * Open Graph profile:first_name — required when og:type is "profile".
   * Facebook and LinkedIn parse this to enrich social previews for author pages
   * with the author's given name.
   */
  ogProfileFirstName?: string;
  /**
   * Open Graph profile:last_name — required when og:type is "profile".
   * Used by social crawlers to display the author's family name alongside
   * the given name in card previews and Open Graph debug tools.
   */
  ogProfileLastName?: string;
  /**
   * Open Graph profile:username — the author's social handle (without @).
   * Populated from the author's Twitter/X handle when available. Enables
   * social platforms to link the profile page to the author's social account.
   */
  ogProfileUsername?: string;
  /**
   * Extra raw <link> HTML tags injected into <head> before JSON-LD blocks.
   * Used for RSS autodiscovery on author pages and any other per-page link
   * annotations that aren't article:* meta tags.
   */
  headLinks?: string[];
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

  // Patch og:image:width / og:image:height when explicit dimensions are
  // provided. The index.html defaults (1200 × 630) are correct for /api/og
  // output; pass these fields only when you know the actual image size differs
  // (e.g. a custom cover image with known dimensions).
  if (p.ogImageWidth !== undefined) {
    html = html.replace(
      /(<meta property="og:image:width" content=")[^"]*(")/,
      `$1${p.ogImageWidth}$2`,
    );
  }
  if (p.ogImageHeight !== undefined) {
    html = html.replace(
      /(<meta property="og:image:height" content=")[^"]*(")/,
      `$1${p.ogImageHeight}$2`,
    );
  }

  html = html.replace(/(<meta name="twitter:url" content=")[^"]*(")/,         `$1${esc(p.canonical)}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${esc(p.ogTitle)}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${esc(p.ogDescription)}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/,       `$1${esc(p.ogImage)}$2`);
  html = html.replace(/(<meta name="twitter:image:alt" content=")[^"]*(")/,    `$1${esc(p.ogImageAlt)}$2`);

  // Collect all injections (structured data + article meta) and insert
  // them as a block just before </head>. Order:
  //   1. Self-referential hreflang <link> tags (Google requires these in HTML
  //      <head> as well as in sitemaps for full spec compliance).
  //   2. Extra per-page <link> tags (RSS autodiscovery, etc.).
  //   3. JSON-LD structured data blocks.
  //   4. Article OG meta tags (article:section, article:tag, etc.).
  const injections: string[] = [];

  // Hreflang: for this English-only site we declare both "en" and "x-default"
  // pointing to the same canonical URL. These are injected server-side so
  // crawlers that don't execute JavaScript still see them.
  injections.push(`  <link rel="alternate" hreflang="en" href="${esc(p.canonical)}" />`);
  injections.push(`  <link rel="alternate" hreflang="x-default" href="${esc(p.canonical)}" />`);

  // og:locale:alternate — injected server-side so crawlers see the multi-market
  // locale signals that PageMeta.tsx emits client-side. Mirrors the en_GB, en_SG,
  // en_AU alternates declared in PageMeta.tsx for consistent signal across both
  // rendering paths. FintechPressHub serves UK, Singapore, and Australian fintech
  // markets alongside the US, so these alternates are semantically accurate.
  injections.push(`  <meta property="og:locale:alternate" content="en_GB" />`);
  injections.push(`  <meta property="og:locale:alternate" content="en_SG" />`);
  injections.push(`  <meta property="og:locale:alternate" content="en_AU" />`);

  // Extra per-page <link> tags (e.g., author RSS autodiscovery).
  if (p.headLinks && p.headLinks.length > 0) {
    for (const link of p.headLinks) {
      injections.push(link);
    }
  }

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

  if (p.articlePublishedTime) {
    injections.push(`  <meta property="article:published_time" content="${esc(p.articlePublishedTime)}" />`);
  }

  if (p.articleModifiedTime) {
    injections.push(`  <meta property="article:modified_time" content="${esc(p.articleModifiedTime)}" />`);
  }

  // article:author — emit profile URL when available (OG spec prefers URLs);
  // fall back to display name string for authors without a profile page.
  if (p.articleAuthorUrl) {
    injections.push(`  <meta property="article:author" content="${esc(p.articleAuthorUrl)}" />`);
  } else if (p.articleAuthor) {
    injections.push(`  <meta property="article:author" content="${esc(p.articleAuthor)}" />`);
  }

  if (p.twitterCreator) {
    injections.push(`  <meta name="twitter:creator" content="${esc(p.twitterCreator)}" />`);
  }

  if (p.author) {
    injections.push(`  <meta name="author" content="${esc(p.author)}" />`);
  }

  // article:publisher — organisation's social profile URL for article pages.
  // Separate from article:author (the individual writer) — Facebook and
  // LinkedIn use this tag to attribute the article to the publishing entity
  // and surface FintechPressHub's org profile in social card previews.
  if (p.articlePublisher) {
    injections.push(`  <meta property="article:publisher" content="${esc(p.articlePublisher)}" />`);
  }

  // Open Graph profile namespace — required when og:type is "profile".
  // Facebook and LinkedIn parse these to populate author profile cards;
  // without them, social previews for /authors/:slug are missing name
  // context even though og:type correctly signals a profile page type.
  if (p.ogProfileFirstName) {
    injections.push(`  <meta property="profile:first_name" content="${esc(p.ogProfileFirstName)}" />`);
  }
  if (p.ogProfileLastName) {
    injections.push(`  <meta property="profile:last_name" content="${esc(p.ogProfileLastName)}" />`);
  }
  if (p.ogProfileUsername) {
    injections.push(`  <meta property="profile:username" content="${esc(p.ogProfileUsername)}" />`);
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
      : BREADCRUMB_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ name: label, url: `${siteUrl}${acc}` });
  });
  return crumbs;
}

// ---------- static meta lookups (no DB needed) ----------

const CATEGORY_META: Record<string, { title: string; description: string; about: string[] }> = {
  payments: {
    title: "Payments Articles | FintechPressHub",
    description: "Expert analysis and guides on payment infrastructure, card issuing, cross-border rails, and payment orchestration for fintech teams.",
    about: ["Payments Infrastructure", "Card Issuing", "Payment Orchestration", "Cross-border Payments"],
  },
  "embedded-finance": {
    title: "Embedded Finance Articles | FintechPressHub",
    description: "Deep dives into BaaS architecture, embedded lending, and vertical SaaS payments powering the next wave of fintech products.",
    about: ["Embedded Finance", "BaaS Architecture", "Embedded Lending", "Vertical SaaS"],
  },
  "open-banking": {
    title: "Open Banking Articles | FintechPressHub",
    description: "Coverage of PSD3, account-to-account payments, variable recurring payments, and open data compliance for regulated fintechs.",
    about: ["Open Banking", "PSD3", "Account-to-Account Payments", "Variable Recurring Payments"],
  },
  neobanking: {
    title: "Neobanking Articles | FintechPressHub",
    description: "Strategies and analysis for digital banks on activation, retention, fee economics, and regulatory positioning.",
    about: ["Neobanking", "Digital Banks", "Challenger Banks", "Mobile Banking"],
  },
  lending: {
    title: "Lending Articles | FintechPressHub",
    description: "Insights on BNPL, SME lending, cash-flow underwriting, embedded credit, and consumer affordability for lending fintechs.",
    about: ["Fintech Lending", "BNPL", "SME Lending", "Cash-flow Underwriting"],
  },
  regtech: {
    title: "Regtech & Compliance Articles | FintechPressHub",
    description: "Expert guides on transaction monitoring, reg reporting, sanctions screening, and KYC/AML tooling.",
    about: ["Regtech", "Compliance", "KYC", "AML", "Transaction Monitoring"],
  },
  wealthtech: {
    title: "Wealthtech Articles | FintechPressHub",
    description: "Analysis of robo-advisors, portfolio construction, advisor SaaS marketing, and self-directed investing platforms.",
    about: ["Wealthtech", "Robo-advisors", "Wealth Management", "Investment Technology"],
  },
  "fintech-seo": {
    title: "Fintech SEO Articles | FintechPressHub",
    description: "Actionable SEO guides, content strategy, and link-building playbooks specifically for fintech and financial services companies.",
    about: ["Fintech SEO", "Content Strategy", "Link Building", "Search Engine Optimisation"],
  },
};

/**
 * Static FAQ content for each service detail page.
 * These Q&As are injected as FAQPage JSON-LD so Google can display rich
 * featured-snippet results for service-intent queries ("what is fintech
 * content writing", "how does off-page SEO work for fintech", etc.).
 *
 * SYNC RULE: When adding a new service slug, add a corresponding entry here
 * so the FAQPage schema is never missing from a live service page.
 */
const SERVICE_FAQS: Readonly<Record<string, ReadonlyArray<{ question: string; answer: string }>>> = {
  "fintech-content-writing": [
    {
      question: "What is fintech content writing?",
      answer: "Fintech content writing is the creation of expert, compliance-aware written content — articles, whitepapers, case studies, and landing pages — tailored to audiences in financial technology. It requires deep knowledge of products like payments, lending, and open banking, as well as an understanding of regulatory requirements in markets such as the UK, US, EU, and APAC.",
    },
    {
      question: "Why do fintech companies need specialist content writers?",
      answer: "Fintech content sits in a YMYL (Your Money or Your Life) category that Google scrutinises under strict E-E-A-T criteria. Generic writers produce factual errors and compliance risks. Specialist fintech writers understand regulatory nuance, communicate complex financial products clearly, and produce content Google rewards with sustainable rankings.",
    },
    {
      question: "What does a fintech content writing retainer include?",
      answer: "A FintechPressHub content writing retainer includes topic research, full SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, on-page optimisation, internal linking, unlimited revisions before publication, and optional CMS upload.",
    },
  ],
  "off-page-seo": [
    {
      question: "What is off-page SEO for fintech?",
      answer: "Off-page SEO for fintech is the practice of building editorial backlinks, brand mentions, and authority signals from high-Domain Rating publications relevant to financial technology. It includes guest posting on Finextra, The Fintech Times, and similar outlets, as well as digital PR and strategic link placements.",
    },
    {
      question: "Why is off-page SEO harder for fintech companies?",
      answer: "Financial content is heavily scrutinised by editors and regulated by compliance requirements, making it far harder to earn placements on tier-1 finance publications than on generic blogs. Fintech companies need specialist editorial relationships and proven writer credentials to secure links that actually move rankings.",
    },
    {
      question: "How long does off-page SEO take to show results for fintech?",
      answer: "First links can be placed within 4–6 weeks. Meaningful ranking movement typically emerges after 3–4 months of consistent link acquisition. Compounding authority — where each new link amplifies the impact of existing ones — becomes visible around month 6–9 for most fintech keywords.",
    },
  ],
  "guest-posting": [
    {
      question: "What is guest posting for fintech?",
      answer: "Guest posting for fintech is the process of placing expert articles on high-authority financial publications — such as Finextra, Tearsheet, and The Fintech Times — that include a dofollow editorial backlink to your site. Each placement builds domain authority and exposes your brand to the readership of those publications.",
    },
    {
      question: "Are the guest post backlinks dofollow?",
      answer: "Yes. FintechPressHub secures permanent, dofollow backlinks from publications with Domain Rating 60 or higher. We do not use PBNs, link farms, or paid-placement networks that violate Google's guidelines.",
    },
    {
      question: "How do you pitch guest posts for fintech companies?",
      answer: "Our team researches the editorial calendar and contributor requirements of each target publication, crafts a tailored pitch matching the publication's current coverage gaps, and writes the article once the pitch is accepted. The entire process — pitch, writing, editing, and placement — is managed on your behalf.",
    },
  ],
  "topical-authority": [
    {
      question: "What is topical authority in fintech SEO?",
      answer: "Topical authority is the degree to which Google treats a website as the definitive source on a given subject. For fintech, it means systematically covering every angle of a topic cluster — from introductory definitions to advanced practitioner guides — so Google's algorithms rank your content preferentially across the entire subject area.",
    },
    {
      question: "How do you build topical authority for a fintech brand?",
      answer: "Topical authority is built through a structured content cluster strategy: one high-quality pillar page per major topic (e.g. payment orchestration) supported by 8–15 cluster articles covering related subtopics, definitions, comparisons, and use cases. Internal linking ties the cluster together, and supporting backlinks signal authority to Google.",
    },
    {
      question: "How long does it take to establish topical authority in fintech?",
      answer: "A well-executed topical authority programme typically takes 4–6 months to show measurable ranking gains on cluster content and 9–12 months for the pillar page to rank in positions 1–5 for competitive head terms. The compounding effect accelerates after the 6-month mark as internal linking density and backlink volume reach critical thresholds.",
    },
  ],
  "fintech-seo-audit": [
    {
      question: "What is a fintech SEO audit?",
      answer: "A fintech SEO audit is a comprehensive analysis of a financial technology company's organic search performance — covering technical site health, on-page optimisation, content gaps, E-E-A-T signals, backlink profile quality, and YMYL compliance. The output is a prioritised action plan with clear effort-to-impact estimates.",
    },
    {
      question: "What does a FintechPressHub SEO audit include?",
      answer: "Our audit covers: technical crawlability and Core Web Vitals, structured data validation, content gap analysis against top-ranking competitors, E-E-A-T signals (author credentials, trust signals, editorial standards), backlink profile health and disavow recommendations, site architecture and internal linking, and a 90-day action roadmap.",
    },
    {
      question: "How often should a fintech company run an SEO audit?",
      answer: "A comprehensive SEO audit is recommended at least once per year, and after any major site redesign, CMS migration, or Google core update. Fintech companies in regulated verticals should also audit after any significant product launch or regulatory change that affects their content strategy.",
    },
  ],
};

/**
 * Indicative price ranges for each service page — injected into the
 * FinancialService JSON-LD `priceRange` property. This helps Google
 * populate Knowledge Panel price signals and improves commercial-intent
 * rich-result eligibility for queries like "fintech SEO agency pricing".
 *
 * SYNC RULE: Keep aligned with the pricing plans in /pricing and with the
 * `pricingPlansTable` data. Use general retainer ranges, not plan-level
 * point prices, so the schema stays accurate across plan changes.
 */
const SERVICE_PRICE_RANGE: Readonly<Record<string, string>> = {
  "fintech-content-writing": "$3,500–$12,000/month",
  "off-page-seo":            "$3,500–$12,000/month",
  "guest-posting":           "$3,500–$12,000/month",
  "topical-authority":       "$3,500–$12,000/month",
  "fintech-seo-audit":       "One-time engagement from $2,500",
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
    title: "Managed Fintech SEO vs DIY SEO Tools vs Self-Managed | FintechPressHub",
    description: "Compare a managed fintech SEO retainer with a DIY approach using Ahrefs, Semrush, or Moz, plus an internal team to execute. See what each model actually delivers.",
  },
  "vs-pr-agencies": {
    title: "Fintech SEO vs Traditional PR vs Digital Communications | FintechPressHub",
    description: "Compare fintech SEO with traditional PR and digital comms agencies. Understand which channel drives sustainable organic traffic versus short-term brand mentions.",
  },
  "content-led-vs-paid": {
    title: "Content-Led SEO vs Google Ads vs Hybrid for Fintech | FintechPressHub",
    description: "Compare organic content SEO, paid search (Google Ads), and a hybrid approach for fintech companies. Understand cost per lead, time to value, and long-term ROI.",
  },
  "specialist-vs-generalist": {
    title: "Fintech Specialist SEO vs B2B Generalist vs Consumer Marketing Agency | FintechPressHub",
    description: "Compare a fintech-specialist SEO agency against a B2B generalist and a consumer marketing agency. Understand which agency type fits a regulated financial services company.",
  },
};

/**
 * Additional FAQ entries per comparison page. Each array supplements the
 * primary Q&A (derived from COMPARISON_META title + description) to give
 * the FAQPage schema enough mainEntity items to qualify for rich results.
 */
const COMPARE_FAQ_EXTRAS: Record<string, Array<{ question: string; answer: string }>> = {
  "agency-vs-in-house": [
    {
      question: "What does a fintech SEO agency cost compared to an in-house team?",
      answer: "A mid-tier fintech SEO retainer typically runs $5,000–$15,000/month, covering strategy, content, and link building. Building an equivalent in-house team (SEO lead, writer, digital PR) typically costs $200,000–$350,000/year in salaries, benefits, and tooling — 3–4× the retainer cost for comparable output in year one.",
    },
    {
      question: "When should a fintech company hire in-house SEO instead of using an agency?",
      answer: "In-house SEO makes sense when your company has Series B+ funding, a content roadmap requiring 20+ pieces per month, or a need for deeply embedded institutional knowledge. For most pre-Series B fintechs, the speed-to-output and specialist expertise of a focused agency outweigh the control benefits of an in-house hire.",
    },
  ],
  "vs-freelancers": [
    {
      question: "Are freelance fintech writers cheaper than an agency?",
      answer: "Per-piece rates from experienced freelance fintech writers range from $300–$1,500 per article. When all costs are included — brief creation, editing rounds, keyword research, and internal coordination — a managed agency is typically 20–40% cheaper at equivalent quality and produces more consistent output.",
    },
    {
      question: "What is the biggest risk of using freelance fintech writers?",
      answer: "The primary risks are inconsistency and compliance exposure. Freelancers vary in quality between assignments, have no obligation to follow your evolving messaging guidelines, and rarely carry professional indemnity insurance for factual errors in regulated-finance content.",
    },
  ],
  "vs-seo-tools": [
    {
      question: "Can Ahrefs or Semrush replace a fintech SEO agency?",
      answer: "SEO tools provide data — keyword volumes, backlink counts, technical audits — but not execution. A tool can tell you that 'payment orchestration' is a high-value keyword; it cannot create authoritative content, build links from Finextra, or maintain a topical-authority content cluster. Agencies own the strategy and do the work; tools are inputs.",
    },
    {
      question: "How much do enterprise SEO tools cost versus a fintech SEO agency?",
      answer: "Enterprise Ahrefs or Semrush plans run $500–$1,000/month. Add a content writer, link-builder, and strategist and you're at $11,500–$22,000/month to replicate what a specialist fintech SEO retainer delivers at $5,000–$12,000/month.",
    },
  ],
  "vs-pr-agencies": [
    {
      question: "What is the difference between fintech SEO and PR for fintechs?",
      answer: "PR agencies focus on brand awareness and earned media — success is measured in mentions and impressions. SEO agencies focus on organic search rankings and durable traffic — success is measured in keyword positions, organic sessions, and lead quality. The best fintech programmes combine both, but the disciplines have fundamentally different metrics.",
    },
    {
      question: "Do PR agencies build backlinks for fintech SEO?",
      answer: "Traditional PR agencies build brand mentions, many of which are nofollow or unlinked. Fintech SEO agencies specifically target dofollow editorial links on high-DR finance publications — a materially different outcome that passes PageRank and drives durable rankings.",
    },
  ],
  "content-led-vs-paid": [
    {
      question: "How long does content-led SEO take to generate ROI for fintechs?",
      answer: "Bottom-of-funnel content can rank and convert within 60–90 days. Competitive head terms typically require 4–6 months of consistent publishing and supporting links. By month 9–12, compounding topical authority means each new piece ranks faster and costs less per organic visitor than any paid channel.",
    },
    {
      question: "What is the average CPC for fintech keywords on Google Ads?",
      answer: "Fintech keywords are among the most expensive on Google Ads, with average CPCs ranging from $15–$80 for terms like 'business banking', 'payment processing', and 'fintech SEO'. Content-led SEO achieves the same clicks at a fraction of the ongoing cost once content is ranking, with no cost per click regardless of search volume.",
    },
  ],
  "specialist-vs-generalist": [
    {
      question: "Why does fintech specifically need a specialist SEO agency?",
      answer: "Fintech content is regulated under FCA, SEC, and CFPB guidelines in most markets, meaning factual errors carry legal and reputational risk beyond a standard retraction. Generalist agencies lack the writer bench with hands-on fintech experience, the publication relationships with Finextra and The Fintech Times, and the regulatory awareness needed to avoid compliance failures.",
    },
    {
      question: "What is the typical performance gap between specialist and generalist SEO for fintech?",
      answer: "Fintechs switching from generalist to specialist SEO agencies typically see a 3–5× increase in topically relevant keyword rankings within six months and a 2–4× reduction in content revision cycles due to eliminated fact-checking errors. Link acquisition speed increases because specialist agencies have pre-existing editorial relationships with finance publications.",
    },
  ],
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
/**
 * Pricing page FAQ items — mirrors the static `faqs` array in
 * artifacts/fintechpresshub/src/pages/pricing.tsx. Kept here so the SSR
 * middleware can emit FAQPage JSON-LD for Googlebot without a DB query.
 *
 * SYNC RULE: When adding, removing, or editing questions in pricing.tsx,
 * update this array too so SSR and client-side schemas stay identical.
 */
const PRICING_FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "Do you require long-term contracts?",
    answer: "We typically operate on 6-month minimum engagements because SEO is a long-term play. It takes time to audit, produce high-quality content, and build the authority needed to see significant ROI.",
  },
  {
    question: "Are the backlinks dofollow?",
    answer: "Yes. We secure permanent, dofollow backlinks from high Domain Rating (DR 60+) sites relevant to the financial industry. No PBNs, no spam.",
  },
  {
    question: "Can we upgrade or downgrade our plan?",
    answer: "Absolutely. You can adjust your retainer at the end of any billing cycle to match your current growth priorities and budget.",
  },
  {
    question: "How long until we see results from fintech SEO?",
    answer: "Most clients see meaningful ranking improvements in 3-4 months and significant organic traffic growth by month 6. Fintech is a competitive, regulated vertical, so authority and topical depth take time to compound — but the traffic we build is durable.",
  },
  {
    question: "Do you only work with fintech companies?",
    answer: "Yes. We work exclusively with fintech, payments, lending, wealth, and banking infrastructure companies. That focus is what lets our writers and link builders deliver work that meets compliance, accuracy, and E-E-A-T standards Google rewards in YMYL verticals.",
  },
  {
    question: "What is included in a content piece?",
    answer: "Every article includes topic research, SEO brief with target keywords and SERP analysis, original writing by a fintech-experienced editor, internal linking, on-page optimization, and unlimited revisions before publish. We also handle CMS upload if requested.",
  },
];

const STATIC_META: Record<string, { title: string; description: string; ogType?: string }> = {
  "/": {
    title: "Fintech SEO & Content Marketing Agency | FintechPressHub",
    description: "Specialist fintech SEO & content marketing agency — expert writers, tier-1 link placements, and measurable organic rankings for ambitious fintech brands.",
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
  "/locations": {
    title: "Fintech SEO by Location | FintechPressHub",
    description: "Specialist fintech SEO, content marketing, and link-building services tailored to your city. Browse all locations we serve globally.",
  },
};

// ── Module-level SEO maps (computed once at startup, never rebuilt per-request) ──

/**
 * Exact last-modification dates for static pages — used in WebPage JSON-LD schemas.
 * Previously defined inside handleSsrMeta, causing the object to be reconstructed
 * on every request. Now at module level for zero allocation cost per request.
 */
const STATIC_PAGE_LASTMOD: Readonly<Record<string, string>> = {
  "/":                                "2026-05-11",
  "/about":                           "2026-05-09",
  "/services":                        "2026-05-09",
  "/pricing":                         "2026-05-11",
  "/blog":                            "2026-05-11",
  "/authors":                         "2026-05-09",
  "/write-for-us":                    "2026-04-25",
  "/editorial-guidelines":            "2026-04-28",
  "/community-guidelines":            "2026-04-28",
  "/tools":                           "2026-05-09",
  // Tool sub-page lastmod is sourced from TOOL_PAGE_LASTMOD in seoConstants.ts
  // (single source of truth). Do not add /tools/* entries here.
  "/glossary":                        "2026-05-09",
  "/resources/fintech-publications":  "2026-05-09",
  "/press":                           "2026-05-09",
  "/contact":                         "2026-04-25",
  "/privacy-policy":                  "2026-04-28",
  "/refund-policy":                   "2026-04-28",
  "/cookie-policy":                   "2026-04-28",
  "/terms":                           "2026-04-28",
  "/compare":                         "2026-05-09",
  // Compare sub-page lastmod is sourced from COMPARE_PAGE_LASTMOD in seoConstants.ts
  // (single source of truth). Do not add /compare/* entries here.
  "/locations":                        "2026-05-10",
};

/**
 * First-published dates for static pages — used in WebPage JSON-LD schemas.
 * Tells Google exactly when each page was created, which is a distinct and
 * stronger freshness signal than dateModified alone. Use founding date (2021)
 * for evergreen policy / legal pages that predate the current CMS.
 */
const STATIC_PAGE_CREATED: Readonly<Record<string, string>> = {
  "/":                                "2021-01-01",
  "/about":                           "2021-01-01",
  "/services":                        "2021-06-01",
  "/pricing":                         "2022-01-01",
  "/blog":                            "2021-06-01",
  "/authors":                         "2021-06-01",
  "/write-for-us":                    "2023-01-01",
  "/editorial-guidelines":            "2023-03-01",
  "/community-guidelines":            "2023-03-01",
  "/tools":                           "2024-01-01",
  "/glossary":                        "2024-06-01",
  "/compare":                         "2024-09-01",
  "/press":                           "2023-06-01",
  "/contact":                         "2021-01-01",
  "/locations":                       "2025-01-01",
  "/resources/fintech-publications":  "2024-01-01",
  "/privacy-policy":                  "2021-01-01",
  "/refund-policy":                   "2021-01-01",
  "/cookie-policy":                   "2021-01-01",
  "/terms":                           "2021-01-01",
};

/**
 * Per-page OG image parameters for static pages.
 * Every static page previously received the same generic opengraph.jpg, meaning
 * all 19 static routes looked identical in social shares and carried no image
 * diversity signal for crawlers. Each page now gets a unique, branded OG card
 * via /api/og with a page-specific title and category pill.
 */
const STATIC_OG_META: Readonly<Record<string, { category: string; ogTitle: string }>> = {
  "/":                                { category: "Agency",      ogTitle: "Fintech SEO & Content Marketing Agency | FintechPressHub" },
  "/about":                           { category: "About",       ogTitle: "About FintechPressHub" },
  "/services":                        { category: "Services",    ogTitle: "Fintech SEO & Content Marketing Services" },
  "/pricing":                         { category: "Pricing",     ogTitle: "Transparent Fintech SEO Pricing" },
  "/blog":                            { category: "Blog",        ogTitle: "Fintech SEO & Content Marketing Insights" },
  "/authors":                         { category: "Authors",     ogTitle: "Our Expert Fintech Authors" },
  "/write-for-us":                    { category: "Guest Posts", ogTitle: "Write For FintechPressHub" },
  "/editorial-guidelines":            { category: "Editorial",   ogTitle: "Editorial Guidelines" },
  "/community-guidelines":            { category: "Guidelines",  ogTitle: "Community Guidelines" },
  "/tools":                           { category: "Tools",       ogTitle: "Free Fintech Marketing Tools" },
  "/glossary":                        { category: "Glossary",    ogTitle: "Fintech Glossary" },
  "/compare":                         { category: "Compare",     ogTitle: "Fintech SEO Agency Comparisons" },
  "/press":                           { category: "Media",       ogTitle: "Press & Media Kit" },
  "/contact":                         { category: "Contact",     ogTitle: "Contact FintechPressHub" },
  "/privacy-policy":                  { category: "Legal",       ogTitle: "Privacy Policy" },
  "/refund-policy":                   { category: "Legal",       ogTitle: "Refund Policy" },
  "/cookie-policy":                   { category: "Legal",       ogTitle: "Cookie Policy" },
  "/terms":                           { category: "Legal",       ogTitle: "Terms & Conditions" },
  "/resources/fintech-publications":  { category: "Resources",   ogTitle: "Top Fintech Publications" },
  "/locations":                       { category: "Locations",   ogTitle: "Fintech SEO by Location" },
};

/**
 * Step-by-step HowTo instructions for the six tool pages that follow a clear
 * linear workflow (paste → run → review → apply). Emitting HowTo schema
 * alongside SoftwareApplication enables a second rich-result type in Google
 * SERPs (step-by-step display) for queries like "how to check readability".
 */
const TOOLS_HOWTO: Readonly<Record<string, {
  name: string;
  description: string;
  totalTime?: string;
  steps: Array<{ name: string; text: string }>;
}>> = {
  "readability-checker": {
    name: "How to Check Your Article's Readability",
    description: "Use the FintechPressHub Readability Checker to score your fintech content for clarity and reading grade level.",
    steps: [
      { name: "Paste your content",  text: "Copy your article text and paste it into the readability checker input box." },
      { name: "Run the analysis",    text: "Click 'Analyse' to instantly calculate your Flesch Reading Ease score and reading grade level." },
      { name: "Review your score",   text: "Check your 0–100 readability score, average sentence length, and syllable count breakdown." },
      { name: "Apply improvements",  text: "Follow the actionable tips to shorten complex sentences, simplify vocabulary, and improve your content's clarity for fintech audiences." },
    ],
  },
  "financial-health-score-calculator": {
    name: "How to Calculate Your Financial Health Score",
    description: "Use the FintechPressHub Financial Health Score Calculator to benchmark your personal finances with a 0–100 score.",
    totalTime: "PT2M",
    steps: [
      { name: "Enter your monthly income",                    text: "Input your take-home pay after tax, including all income sources." },
      { name: "Fill in your monthly expenses and debt payments", text: "Add your total living costs and minimum monthly debt payments — credit cards, loans, and BNPL." },
      { name: "Complete savings and emergency fund fields",    text: "Enter how much you save each month and your total liquid emergency fund balance. Your 0–100 score updates automatically as you type — no button required." },
      { name: "Review your score and breakdown",              text: "The calculator outputs a financial health score with debt-to-income ratio, savings rate, emergency fund coverage in months, and personalised improvement tips." },
    ],
  },
  "meta-description-generator": {
    name: "How to Generate SEO Meta Descriptions",
    description: "Use the FintechPressHub Meta Description Generator to create three ready-to-use meta descriptions for any page.",
    steps: [
      { name: "Enter your page title",   text: "Type the title of the page you want to optimise into the page title field." },
      { name: "Add your target keyword", text: "Enter the primary keyword you want to rank for — the generator will weave it naturally into each description." },
      { name: "Generate descriptions",   text: "Click 'Generate' to receive three distinct, 150–160 character meta descriptions optimised for click-through rate." },
      { name: "Copy and apply",          text: "Select the description that best matches your page's intent and paste it into your CMS or HTML." },
    ],
  },
  "guest-post-pitch-generator": {
    name: "How to Generate a Guest Post Pitch",
    description: "Use the FintechPressHub Guest Post Pitch Generator to write a personalised pitch email for any fintech publication.",
    steps: [
      { name: "Enter your details",      text: "Fill in your name, company, and area of fintech expertise to personalise the pitch." },
      { name: "Add publication details", text: "Enter the target publication name, the editor's name, and your proposed article title." },
      { name: "Generate your pitch",     text: "Click 'Generate Pitch' to produce a professional, personalised outreach email ready to send." },
      { name: "Review and send",         text: "Read through the generated pitch, adjust any details, and send it directly to the editor." },
    ],
  },
  "content-brief-generator": {
    name: "How to Generate a Content Brief",
    description: "Use the FintechPressHub Content Brief Generator to create a comprehensive brief for any fintech article.",
    steps: [
      { name: "Enter your target keyword", text: "Input the primary keyword or topic your article should target to rank in search results." },
      { name: "Specify your audience",     text: "Describe your target reader — e.g. 'fintech founders', 'compliance officers', 'payments product managers'." },
      { name: "Generate the brief",        text: "Click 'Generate Brief' to receive a structured content brief with suggested headings, questions to answer, and key points to cover." },
      { name: "Share with your writer",    text: "Download or copy the brief and share it with your content writer to ensure on-target, well-structured output." },
    ],
  },
  "headline-analyzer": {
    name: "How to Analyse Your Article Headline",
    description: "Use the FintechPressHub Headline Analyzer to score your title for SEO power, emotional impact, and click-worthiness.",
    steps: [
      { name: "Enter your headline",    text: "Type or paste your article headline into the analyzer input field." },
      { name: "Run the analysis",       text: "Click 'Analyse Headline' to score your title across four dimensions: SEO power, emotional impact, readability, and clarity." },
      { name: "Review your scores",     text: "Check your overall headline score and see where your title is strong or needs improvement." },
      { name: "Apply the suggestions",  text: "Use the improvement tips to add power words, adjust length, or improve specificity for higher click-through rates." },
    ],
  },
  "keyword-difficulty-estimator": {
    name: "How to Estimate Fintech Keyword Difficulty",
    description: "Use the FintechPressHub Keyword Difficulty Estimator to score any fintech keyword and discover quick-win opportunities.",
    steps: [
      { name: "Enter your keyword",      text: "Type the fintech keyword or phrase you want to evaluate into the keyword input field." },
      { name: "Run the estimate",        text: "Click 'Estimate Difficulty' to receive a 0–100 difficulty score, search intent classification, estimated monthly volume range, and six long-tail keyword variations." },
      { name: "Review the difficulty score", text: "Check your keyword's difficulty rating against the traffic potential. A score below 40 signals a quick-win opportunity for new fintech publishers." },
      { name: "Target long-tail variations", text: "Use the six suggested long-tail variations in your content plan — lower-difficulty variations often drive more qualified, bottom-of-funnel traffic." },
    ],
  },
  "backlink-value-estimator": {
    name: "How to Estimate the SEO Value of a Backlink",
    description: "Use the FintechPressHub Backlink Value Estimator to score any referring domain before you invest time in outreach.",
    steps: [
      { name: "Enter the referring domain details", text: "Input the domain's Domain Authority (DA), estimated monthly organic traffic, and topical relevance score on a 1–10 scale." },
      { name: "Run the valuation",                  text: "Click 'Estimate Value' to receive a weighted backlink value score out of 100, combining authority, traffic, and relevance." },
      { name: "Review the score breakdown",         text: "Examine the three contributing factors — authority weight, traffic weight, and relevance multiplier — to understand what drives the overall value." },
      { name: "Prioritise your outreach list",      text: "Sort your prospect list by value score and focus outreach effort on the highest-scoring domains first for maximum ranking impact." },
    ],
  },
  "link-prospector": {
    name: "How to Prospect Fintech Link Building Opportunities",
    description: "Use the FintechPressHub Link Prospector to bulk-score backlink prospects and build a prioritised outreach list.",
    steps: [
      { name: "Paste your domain list",     text: "Enter a list of referring domains you want to evaluate — one domain per line — into the prospect input field." },
      { name: "Score all prospects",        text: "Click 'Score Prospects' to receive an SEO value score for each domain based on authority, traffic, and fintech relevance signals." },
      { name: "Filter by value or effort",  text: "Sort the scored list by 'Highest Value' to find premium link targets, or by 'Easiest Win' to find low-hanging opportunities for quick gains." },
      { name: "Export and begin outreach",  text: "Copy the prioritised prospect list into your outreach tracker and start pitching the top-ranked domains first to maximise your link-building ROI." },
    ],
  },
  "outreach-email-generator": {
    name: "How to Generate a Link Building Outreach Email",
    description: "Use the FintechPressHub Outreach Email Generator to write personalised link-building emails in seconds.",
    steps: [
      { name: "Enter your campaign details",  text: "Fill in your name, company, target domain, the page you want linked to, and your value proposition for the link placement." },
      { name: "Choose your tone",             text: "Select a tone — professional, friendly, or direct — to match the publication's editorial culture and your relationship with the editor." },
      { name: "Generate the email",           text: "Click 'Generate Email' to receive a personalised outreach email with three alternative subject lines scored on estimated open-rate factors." },
      { name: "Review, personalise, and send", text: "Read the generated email, add any publication-specific details or recent content references, then send it directly from your email client." },
    ],
  },
};

// ---------- per-tool FAQ questions (for FAQPage schema on /tools/:slug) ──────
//
// FAQPage schema runs alongside SoftwareApplication + HowTo on each tool page,
// occupying a separate rich-result slot (accordion FAQ) in Google SERPs.
// Three Q&As per tool are sufficient to qualify; the first two are generic
// (free access + primary use-case) and the third is tool-specific.
// Keep answers under 300 chars so Google can render them without truncation.
const TOOLS_FAQ: Readonly<Record<string, Array<{ question: string; answer: string }>>> = {
  "readability-checker": [
    { question: "Is the Readability Checker free?", answer: "Yes — the FintechPressHub Readability Checker is completely free to use with no account or sign-up required." },
    { question: "What does the Readability Checker measure?", answer: "It calculates the Flesch Reading Ease score (0–100), reading grade level, average sentence length, and syllable count for any pasted text." },
    { question: "What readability score should fintech content target?", answer: "Aim for a Flesch score of 50–70 (plain English). Complex B2B fintech content often scores 40–55; below 40 risks high bounce rates from non-specialist readers." },
  ],
  "financial-health-score-calculator": [
    { question: "Is the Financial Health Score Calculator free?", answer: "Yes — the FintechPressHub Financial Health Score Calculator is free to use with no login required." },
    { question: "What does the Financial Health Score measure?", answer: "It produces a 0–100 score across four dimensions: debt-to-income ratio, savings rate, emergency fund coverage, and expense ratio — each reflecting a key pillar of personal financial health." },
    { question: "What is a good Financial Health Score?", answer: "Scores above 70 indicate strong financial health. 50–70 is average and improvement is achievable. Below 50 suggests actionable areas around debt, savings, or emergency reserves." },
    { question: "How is the debt-to-income (DTI) ratio calculated?", answer: "DTI is your total monthly debt payments divided by your monthly income after tax, expressed as a percentage. Most lenders consider 35% the upper limit; 28% or below is preferred for mortgage qualification." },
    { question: "How many months of emergency fund do I really need?", answer: "Three months of essential expenses is the entry-level baseline. Six months is the gold standard for single-earner households. Freelancers or commission-based earners should target nine months." },
    { question: "How do I improve my financial health score?", answer: "Target the ratio with the largest penalty first. If your DTI is above 35%, use the avalanche method to pay down the highest-APR debt. If your savings rate is below 10%, automate a fixed transfer on payday. If your emergency fund is under three months, redirect savings there before investing. Small, consistent improvements to one ratio at a time compound into a measurably higher score within 90 days." },
    { question: "Are my numbers stored anywhere?", answer: "No. The calculator runs entirely in your browser. We never transmit, store, or log the figures you enter — refresh the page and everything is gone." },
  ],
  "meta-description-generator": [
    { question: "Is the Meta Description Generator free?", answer: "Yes — the FintechPressHub Meta Description Generator is free with no account needed." },
    { question: "How long should a meta description be?", answer: "Google typically displays 150–160 characters. The generator targets this range and includes your target keyword naturally for maximum CTR." },
    { question: "Will the generated meta descriptions include my keyword?", answer: "Yes — the generator weaves your target keyword into all three description variants to strengthen on-page relevance signals for Google." },
  ],
  "guest-post-pitch-generator": [
    { question: "Is the Guest Post Pitch Generator free?", answer: "Yes — the FintechPressHub Guest Post Pitch Generator is completely free with no sign-up required." },
    { question: "What information do I need to generate a pitch?", answer: "You need your name, company, fintech expertise area, the target publication name, the editor's name, and your proposed article title." },
    { question: "Can I use the generated pitch for any fintech publication?", answer: "Yes — the pitch is fully customisable and works for any fintech, finance, or B2B publication. Personalise it further with a reference to a recent article before sending." },
  ],
  "content-brief-generator": [
    { question: "Is the Content Brief Generator free?", answer: "Yes — the FintechPressHub Content Brief Generator is free with no account or payment required." },
    { question: "What does the Content Brief Generator produce?", answer: "It outputs a structured brief with suggested headings, questions to answer, key points to cover, and recommended tone — tailored to your target keyword and audience." },
    { question: "Who should use the Content Brief Generator?", answer: "Content strategists, fintech marketing managers, and freelance writers who want a consistent, SEO-optimised brief framework for each article assignment." },
  ],
  "headline-analyzer": [
    { question: "Is the Headline Analyzer free?", answer: "Yes — the FintechPressHub Headline Analyzer is completely free with no login required." },
    { question: "What does the Headline Analyzer score?", answer: "It scores your headline across four dimensions: SEO power, emotional impact, readability, and clarity. You receive an overall score out of 100 with actionable suggestions." },
    { question: "What makes a high-scoring fintech headline?", answer: "High-scoring headlines include a power word, the primary keyword, a specific number or data point, and are 6–12 words long. Avoid jargon that only insiders understand." },
  ],
  "keyword-difficulty-estimator": [
    { question: "Is the Keyword Difficulty Estimator free?", answer: "Yes — the FintechPressHub Keyword Difficulty Estimator is free with no account required." },
    { question: "What does a keyword difficulty score of 0–100 mean?", answer: "0–30 = low competition (quick win). 31–60 = moderate (achievable with quality content and links). 61–100 = high competition (requires strong domain authority and sustained effort)." },
    { question: "Does the estimator suggest alternative keywords?", answer: "Yes — it generates six long-tail keyword variations with lower difficulty scores so you can identify more targeted, quicker-win opportunities within the same topic cluster." },
  ],
  "backlink-value-estimator": [
    { question: "Is the Backlink Value Estimator free?", answer: "Yes — the FintechPressHub Backlink Value Estimator is completely free with no sign-up needed." },
    { question: "What factors determine the backlink value score?", answer: "The score weights Domain Authority (40%), estimated monthly organic traffic (35%), and topical relevance to fintech (25%) to produce a 0–100 value rating." },
    { question: "What score indicates a high-value backlink opportunity?", answer: "A score above 70 indicates a premium backlink target. 50–69 is solid. Below 50 suggests the domain may not move the needle enough to justify outreach effort." },
  ],
  "link-prospector": [
    { question: "Is the Link Prospector free?", answer: "Yes — the FintechPressHub Link Prospector is free to use with no account required." },
    { question: "How many domains can I score with the Link Prospector?", answer: "You can paste and score a list of domains in one batch. It is designed for bulk evaluation so you can prioritise an entire outreach list in a single session." },
    { question: "Can I export my scored prospect list?", answer: "Yes — once scored, you can copy the prioritised list and paste it into any spreadsheet or outreach CRM to begin your link-building campaign." },
  ],
  "outreach-email-generator": [
    { question: "Is the Outreach Email Generator free?", answer: "Yes — the FintechPressHub Outreach Email Generator is completely free with no account required." },
    { question: "What types of outreach emails can it generate?", answer: "It generates personalised link-building outreach emails in three tones — professional, friendly, or direct — with three alternative subject lines per email." },
    { question: "Can I use the generated emails for guest-post pitches too?", answer: "The generator is optimised for link-building outreach, but the template structure works well for guest-post pitches too. Use the Guest Post Pitch Generator for a more targeted pitch format." },
  ],
};

/**
 * Optional featureList for SoftwareApplication schema.
 * Only tools with a meaningful capability list are included — omitting a key
 * means no featureList property is emitted for that tool's schema.
 * Sync with the featureList prop in the page's PageMeta softwareApp prop.
 */
const TOOLS_FEATURE_LIST: Readonly<Record<string, string[]>> = {
  "financial-health-score-calculator": [
    "Debt-to-Income (DTI) ratio calculation",
    "Savings rate analysis",
    "Expense ratio benchmark",
    "Emergency fund coverage in months",
    "Personalised improvement tips",
    "Client-side only — no data stored",
  ],
};

// ---------- per-request SSR-meta patch cache (B1) ────────────────────────────
//
// DB-driven route handlers run at least two SELECT queries per SSR hit
// (e.g. blog: post row + author social row). Under repeated crawler pressure
// the same slug is fetched dozens of times per minute.
//
// Strategy: cache the fully-built `MetaPatches` object for each reqPath with
// a 60-second TTL. A new publish or sitemap invalidation clears the cache via
// `invalidateSsrMetaCache()`. The cache is module-level (process-wide) and
// never persisted, so a fresh deploy always starts cold.
const SSR_META_CACHE_TTL_MS = 60_000;
type SsrMetaCacheEntry = { patches: MetaPatches; cachedAt: number };
const _ssrMetaCache = new Map<string, SsrMetaCacheEntry>();

function getSsrMetaCached(key: string): MetaPatches | null {
  const entry = _ssrMetaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > SSR_META_CACHE_TTL_MS) {
    _ssrMetaCache.delete(key);
    return null;
  }
  return entry.patches;
}

function setSsrMetaCached(key: string, patches: MetaPatches): void {
  _ssrMetaCache.set(key, { patches, cachedAt: Date.now() });
  // Evict oldest entries if cache grows beyond 500 entries (memory guard).
  if (_ssrMetaCache.size > 500) {
    const first = _ssrMetaCache.keys().next().value;
    if (first !== undefined) _ssrMetaCache.delete(first);
  }
}

/** Imperatively evict all cached SSR meta patches (call after content updates). */
export function invalidateSsrMetaCache(): void {
  _ssrMetaCache.clear();
}

// ---------- route regexes (dynamic parameterised routes only) ----------
// Static pages are matched via exact path lookup in STATIC_META above.

const BLOG_RE     = /^\/blog\/([^/]+)$/;
const LOCATION_RE = /^\/locations\/([^/]+)$/;
const GLOSSARY_RE = /^\/glossary\/([^/]+)$/;
const SERVICE_RE  = /^\/services\/([^/]+)$/;
const AUTHOR_RE   = /^\/authors\/([^/]+)$/;
const CATEGORY_RE = /^\/blog\/category\/([^/]+)$/;
const TAG_RE      = /^\/blog\/tag\/([^/]+)$/;
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
    // Fast-path: return cached patches for repeated crawler hits on the same URL.
    // Only dynamic DB-backed routes benefit (static pages are already zero-DB-cost).
    const cachedPatches = getSsrMetaCached(reqPath);
    if (cachedPatches) {
      const html = patchHtml(baseHtml, cachedPatches);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
      // cite-as Link header — W3C standard that tells AI crawlers (Perplexity,
      // ChatGPT Search, Gemini) which canonical URL to use when citing this page.
      // Both rel="canonical" (Bing HTTP-header canonical) and rel="cite-as"
      // (W3C AI citation standard) in one Link header — covers all crawler types.
      res.setHeader("Link", `<${cachedPatches.canonical}>; rel="canonical", <${cachedPatches.canonical}>; rel="cite-as"`);
      if (req.method === "HEAD") { res.end(); } else { res.send(html); }
      return;
    }

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
          faqItems:             blogPostsTable.faqItems,
          blufSummary:          blogPostsTable.blufSummary,
          aboutEntities:        blogPostsTable.aboutEntities,
          mentionEntities:      blogPostsTable.mentionEntities,
          wordCount:            blogPostsTable.wordCount,
          readingMinutes:       blogPostsTable.readingMinutes,
        })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.slug, slug))
        .limit(1);

      if (!post) { res.status(404); return next(); }

      // Future-dated posts: serve a noindex-patched shell rather than the bare
      // SPA fallback so crawlers that discover the URL before publish see an
      // explicit noindex directive instead of a generic unstyled shell.
      if (post.publishedAt > new Date()) {
        const futureTitle = post.seoTitle ?? post.title;
        const futureCanon = `${siteUrl}/blog/${slug}`;
        const futureHtml = patchHtml(baseHtml, {
          title:         `${futureTitle} | FintechPressHub`,
          description:   "",
          canonical:     futureCanon,
          ogTitle:       futureTitle,
          ogDescription: "",
          ogImage:       `${siteUrl}/opengraph.jpg`,
          ogImageAlt:    futureTitle,
          headLinks:     [`  <meta name="robots" content="noindex, nofollow" />`],
        });
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        res.setHeader("Cache-Control", "private, no-store");
        res.send(futureHtml);
        return;
      }

      // Inject noindex directive server-side so crawlers that cannot execute
      // JavaScript still see and obey the directive. Without this, a noindex
      // post served as a bare SPA shell would be treated as indexable because
      // the React-rendered <meta name="robots"> tag is never evaluated.
      if (post.noIndex) {
        const noIndexTitle = post.seoTitle ?? post.title;
        const noIndexCanon = `${siteUrl}/blog/${slug}`;
        const noIndexDesc  = (post.seoDescription ?? post.excerpt ?? "").slice(0, 160);
        const noIndexImg   = `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&category=${encodeURIComponent(post.category)}&author=${encodeURIComponent(post.author)}&authorRole=${encodeURIComponent(post.authorRole ?? "")}`;
        const html = patchHtml(baseHtml, {
          title:         `${noIndexTitle} | FintechPressHub`,
          description:   noIndexDesc,
          canonical:     noIndexCanon,
          ogTitle:       noIndexTitle,
          ogDescription: noIndexDesc,
          ogImage:       noIndexImg,
          ogImageAlt:    noIndexTitle,
          headLinks:     [`  <meta name="robots" content="noindex, nofollow" />`],
        });
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        res.setHeader("Cache-Control", "private, no-store");
        res.send(html);
        return;
      }

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
      const dateModified = (post.lastMaterialUpdateAt ?? post.updatedAt ?? post.publishedAt).toISOString();
      const authorSlug   = post.author ? toAuthorSlug(post.author) : null;
      const authorUrl    = authorSlug ? `${siteUrl}/authors/${authorSlug}` : null;
      const tags         = Array.isArray(post.tags) ? (post.tags as string[]) : [];

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", slug], pageTitle);

      const aboutEntities   = Array.isArray(post.aboutEntities)   ? (post.aboutEntities   as string[]) : [];
      const mentionEntities = Array.isArray(post.mentionEntities) ? (post.mentionEntities as string[]) : [];
      const faqItems        = Array.isArray(post.faqItems)        ? (post.faqItems as Array<{ question: string; answer: string }>) : [];

      // Look up author Twitter handle for twitter:creator tag and social
      // sameAs links for the BlogPosting author entity (E-E-A-T signals).
      let authorTwitter: string | null = null;
      let authorSameAs: string[] = [];
      let authorPhoto: string | null = null;
      if (authorSlug) {
        const [authorRow] = await db
          .select({ social: authorsTable.social, photo: authorsTable.photo })
          .from(authorsTable)
          .where(eq(authorsTable.slug, authorSlug))
          .limit(1);
        const social = (authorRow?.social ?? {}) as { twitter?: string; linkedin?: string; website?: string };
        authorTwitter = social.twitter ?? null;
        // Collect all social profile URLs as sameAs for the Person entity.
        // These strengthen E-E-A-T by linking the author to verified profiles.
        authorSameAs = [social.twitter, social.linkedin, social.website].filter(Boolean) as string[];
        // Author photo included as an ImageObject so Google can match the author
        // entity to their Knowledge Panel and headshot — a direct E-E-A-T signal.
        const rawPhoto = authorRow?.photo ?? null;
        authorPhoto = rawPhoto
          ? rawPhoto.startsWith("http") ? rawPhoto : `${siteUrl}${rawPhoto}`
          : null;
      }

      const extraLds: string[] = [
        JSON.stringify({
          "@context": "https://schema.org",
          // Dual @type gives BlogPosting rich-result eligibility AND NewsArticle
          // eligibility (Google News + article carousels). Both types share the
          // same required properties so no extra fields are needed.
          "@type":    ["BlogPosting", "NewsArticle"],
          // Use the #article fragment so Google can distinguish the content
          // entity from the page-level WebPage entity (which uses the bare
          // canonical). Matches the @id convention in PageMeta.tsx client-side
          // so both rendering paths produce identical entity references.
          "@id":      `${canonical}#article`,
          headline:   post.title,
          description,
          url:        canonical,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          // #blog fragment matches the Blog entity @id in PageMeta.tsx and the
          // WebSite's isPartOf Blog reference — consistent entity graph for
          // Google's Knowledge Graph resolution.
          isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog#blog`, url: `${siteUrl}/blog`, name: "FintechPressHub Blog" },
          image: ogImage.includes("/api/og")
            ? { "@type": "ImageObject", url: ogImage, width: 1200, height: 630 }
            : { "@type": "ImageObject", url: ogImage },
          inLanguage: "en",
          publisher:  { "@id": `${siteUrl}#organization` },
          copyrightYear: post.publishedAt.getFullYear(),
          copyrightHolder: { "@id": `${siteUrl}#organization` },
          // Machine-readable content rights URL — completes the rights stack alongside
          // cite-as header and ai.txt. AI citation engines (Google AIO, Perplexity,
          // ChatGPT Search) parse this to understand what they may do with the content.
          license: `${siteUrl}/terms`,
          datePublished: post.publishedAt.toISOString(),
          dateModified,
          ...(post.author
            ? {
                author: {
                  "@type":    "Person",
                  name:       post.author,
                  ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
                  ...(authorUrl ? { url: authorUrl, "@id": `${authorUrl}#person` } : {}),
                  // Social profile URLs establish author identity for Google's
                  // E-E-A-T assessment — matches the Person entity on /authors/:slug.
                  ...(authorSameAs.length > 0 ? { sameAs: authorSameAs } : {}),
                  // Author headshot gives Google a visual entity anchor to match
                  // the author against their Knowledge Panel — an E-E-A-T signal.
                  ...(authorPhoto ? { image: { "@type": "ImageObject", url: authorPhoto } } : {}),
                },
              }
            : {}),
          ...(post.category ? { articleSection: post.category } : {}),
          ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
          ...(aboutEntities.length > 0
            ? { about: aboutEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          ...(mentionEntities.length > 0
            ? { mentions: mentionEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          ...(post.blufSummary ? { abstract: post.blufSummary.slice(0, 500) } : {}),
          ...(post.wordCount ? { wordCount: post.wordCount } : {}),
          ...(post.readingMinutes && post.readingMinutes > 0 ? { timeRequired: `PT${post.readingMinutes}M` } : {}),
          isAccessibleForFree: true,
          accessMode: ["textual", "visual"],
          potentialAction: { "@type": "ReadAction", target: canonical },
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (faqItems.length > 0) {
        extraLds.push(JSON.stringify({
          "@context":    "https://schema.org",
          "@type":       "FAQPage",
          "@id":         `${canonical}#faq`,
          url:           canonical,
          inLanguage:    "en",
          isPartOf:      { "@id": `${siteUrl}#website` },
          publisher:     { "@id": `${siteUrl}#organization` },
          datePublished: post.publishedAt.toISOString(),
          dateModified:  dateModified,
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name:    item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }, null, 2));
      }

      // WebPage entity emitted for every blog post so Google can resolve
      // the page-level entity distinct from the BlogPosting content entity.
      // Speakable + abstract are conditional on blufSummary existing.
      extraLds.push(JSON.stringify({
        "@context":    "https://schema.org",
        "@type":       "WebPage",
        "@id":         `${canonical}#webpage`,
        url:           canonical,
        inLanguage:    "en",
        isPartOf:      { "@id": `${siteUrl}#website` },
        datePublished: post.publishedAt.toISOString(),
        dateModified:  dateModified,
        speakable: {
          "@type":     "SpeakableSpecification",
          // Always emit a speakable selector. When a BLUF summary exists, target
          // the concise .speakable-summary panel (rendered by blog-post.tsx).
          // When no summary is present, fall back to h1 so Google always has at
          // least the headline to extract for voice and AEO snippet answers.
          cssSelector: post.blufSummary ? [".speakable-summary"] : ["h1"],
        },
        ...(post.blufSummary ? { abstract: post.blufSummary.slice(0, 500) } : {}),
      }, null, 2));

      patches = {
        title:                `${pageTitle} | FintechPressHub`,
        description,
        canonical,
        ogTitle:              pageTitle,
        ogDescription:        description,
        ogImage,
        ogImageAlt:           pageTitle,
        ogType:               "article",
        articleSection:       post.category || undefined,
        articleTags:          tags.length > 0 ? tags : undefined,
        articlePublishedTime: post.publishedAt.toISOString(),
        articleModifiedTime:  dateModified,
        articleAuthor:        post.author || undefined,
        articleAuthorUrl:     authorUrl   || undefined,
        twitterCreator:       authorTwitter ?? undefined,
        author:               post.author   || undefined,
        // article:publisher reinforces E-E-A-T by linking the article to the
        // organisation's LinkedIn profile — Facebook and LinkedIn parse this
        // tag to attribute the content to FintechPressHub in social previews,
        // distinct from article:author which identifies the individual writer.
        articlePublisher:     "https://www.linkedin.com/company/fintechpresshub",
        // twitter:label/data cards surface reading time and category in the
        // Twitter/X card preview — injected as headLinks so patchHtml appends
        // them alongside article:* meta tags in the </head> injection block.
        headLinks: [
          ...(post.readingMinutes && post.readingMinutes > 0
            ? [
                `  <meta name="twitter:label1" content="Reading time" />`,
                `  <meta name="twitter:data1" content="${post.readingMinutes} min read" />`,
                `  <meta name="twitter:label2" content="Category" />`,
                `  <meta name="twitter:data2" content="${esc(post.category ?? "Insights")}" />`,
              ]
            : [
                `  <meta name="twitter:label1" content="Category" />`,
                `  <meta name="twitter:data1" content="${esc(post.category ?? "Insights")}" />`,
              ]),
        ],
        extraLds,
      };
    }

    // ── /locations/:slug ─────────────────────────────────────────────────────
    const locationMatch = LOCATION_RE.exec(reqPath);
    if (locationMatch) {
      const slug = locationMatch[1]!;
      const [loc] = await db
        .select({
          city:           locationPagesTable.city,
          region:         locationPagesTable.region,
          country:        locationPagesTable.country,
          countryCode:    locationPagesTable.countryCode,
          headline:       locationPagesTable.headline,
          seoTitle:       locationPagesTable.seoTitle,
          seoDescription: locationPagesTable.seoDescription,
          publishedAt:    locationPagesTable.publishedAt,
          updatedAt:      locationPagesTable.updatedAt,
        })
        .from(locationPagesTable)
        .where(eq(locationPagesTable.slug, slug))
        .limit(1);

      if (!loc) { res.status(404); return next(); }

      const canonical     = `${siteUrl}/locations/${slug}`;
      const locationLabel = loc.region
        ? `${loc.city}, ${loc.region}, ${loc.country}`
        : `${loc.city}, ${loc.country}`;
      const description   = (
        loc.seoDescription ??
        `FintechPressHub delivers specialist fintech SEO, content marketing, and link-building services to companies operating in ${locationLabel}. Book a free strategy call.`
      ).slice(0, 160);
      const title         = (loc.seoTitle ?? loc.headline) + " | FintechPressHub";
      const ogImage       = `${siteUrl}/api/og?title=${encodeURIComponent(loc.seoTitle ?? loc.headline)}&category=Location`;

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["locations", slug], loc.city);

      const geoPlacename = loc.region
        ? `${loc.city}, ${loc.region}, ${loc.country}`
        : `${loc.city}, ${loc.country}`;
      patches = {
        title,
        description,
        canonical,
        ogTitle:       loc.headline,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `FintechPressHub — ${loc.city} Fintech SEO`,
        headLinks: [
          `  <meta name="geo.placename" content="${esc(geoPlacename)}" />`,
          `  <meta name="geo.region" content="${esc(loc.countryCode)}" />`,
        ],
        extraLds: [
          JSON.stringify({
            "@context":      "https://schema.org",
            "@type":         ["LocalBusiness", "ProfessionalService"],
            "@id":           canonical,
            name:            `FintechPressHub — ${loc.city} Fintech SEO`,
            description:     loc.headline,
            serviceType:     "Fintech SEO & Content Marketing",
            url:             canonical,
            // inLanguage, datePublished, dateModified — present on all other
            // primary content entities (FinancialService, SoftwareApplication,
            // BlogPosting, DefinedTerm) for E-E-A-T freshness scoring.
            inLanguage:      "en",
            datePublished:   loc.publishedAt.toISOString().slice(0, 10),
            dateModified:    loc.updatedAt.toISOString().slice(0, 10),
            address: {
              "@type":          "PostalAddress",
              addressLocality:  loc.city,
              ...(loc.region ? { addressRegion: loc.region } : {}),
              addressCountry:   loc.countryCode,
            },
            areaServed: { "@type": "Place", name: loc.country },
            parentOrganization: { "@id": `${siteUrl}#organization` },
            publisher:   { "@id": `${siteUrl}#organization` },
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "WebPage",
            "@id":         `${canonical}#webpage`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: loc.publishedAt.toISOString().slice(0, 10),
            dateModified:  loc.updatedAt.toISOString().slice(0, 10),
            // SpeakableSpecification enables voice-assistant extraction of the location page
            // headline for "fintech SEO in [city]" and "best fintech agency in [city]" queries —
            // mirrors the speakable coverage applied to all other page types site-wide.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            name:          `Frequently Asked Questions — FintechPressHub ${loc.city}`,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: loc.publishedAt.toISOString().slice(0, 10),
            dateModified:  loc.updatedAt.toISOString().slice(0, 10),
            mainEntity: [
              {
                "@type": "Question",
                name:    `Does FintechPressHub offer fintech SEO services in ${loc.city}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    `Yes. FintechPressHub provides specialist fintech SEO, content marketing, and link-building services to companies operating in ${loc.city}${loc.region ? `, ${loc.region}` : ""}, ${loc.country}. Our team combines local regulatory awareness with deep fintech expertise to build search visibility in your market.`,
                },
              },
              {
                "@type": "Question",
                name:    `What fintech SEO services are available in ${loc.country}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    `In ${loc.country} we offer geo-targeted keyword research, regulatory-compliant content writing, high-authority link placements in ${loc.country}-relevant fintech publications, and a full-funnel content strategy designed for the local fintech buyer journey.`,
                },
              },
              {
                "@type": "Question",
                name:    `How do I get started with fintech SEO in ${loc.city}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    `Book a free 30-minute strategy call via the FintechPressHub contact page. We will audit your current search footprint in ${loc.city} and identify your fastest path to organic growth in the ${loc.country} market.`,
                },
              },
            ],
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
          term:           glossaryTermsTable.term,
          shortDef:       glossaryTermsTable.shortDef,
          category:       glossaryTermsTable.category,
          publishedAt:    glossaryTermsTable.publishedAt,
          updatedAt:      glossaryTermsTable.updatedAt,
          seoTitle:       glossaryTermsTable.seoTitle,
          seoDescription: glossaryTermsTable.seoDescription,
          relatedTerms:   glossaryTermsTable.relatedTerms,
        })
        .from(glossaryTermsTable)
        .where(eq(glossaryTermsTable.slug, slug))
        .limit(1);

      if (!term) { res.status(404); return next(); }

      const canonical   = `${siteUrl}/glossary/${slug}`;
      const description = (term.seoDescription ?? term.shortDef).slice(0, 160);
      const title       = term.seoTitle
        ? `${term.seoTitle} | FintechPressHub`
        : `${term.term} — Fintech Glossary | FintechPressHub`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(term.term)}&category=Glossary`;

      // Resolve related term slugs to seeAlso URLs. The relatedTerms array
      // stores slugs (e.g. "open-banking") that map to /glossary/:slug pages.
      const relatedSlugs = Array.isArray(term.relatedTerms)
        ? (term.relatedTerms as string[]).filter(Boolean)
        : [];
      const seeAlso = relatedSlugs.map((s) => `${siteUrl}/glossary/${s}`);

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["glossary", slug], term.term);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       term.term,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${term.term} definition — FintechPressHub Fintech Glossary`,
        extraLds: [
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "DefinedTerm",
            "@id":         canonical,
            name:          term.term,
            description:   term.shortDef,
            url:           canonical,
            inLanguage:    "en",
            datePublished: term.publishedAt.toISOString().slice(0, 10),
            dateModified:  term.updatedAt.toISOString().slice(0, 10),
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              "@id":   `${siteUrl}/glossary`,
              name:    "Fintech Glossary",
              url:     `${siteUrl}/glossary`,
            },
            ...(term.category ? { subjectOf: { "@type": "Thing", name: term.category } } : {}),
            ...(seeAlso.length > 0 ? { seeAlso } : {}),
            potentialAction: { "@type": "ReadAction", target: canonical },
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "WebPage",
            "@id":         `${canonical}#webpage`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            datePublished: term.publishedAt.toISOString().slice(0, 10),
            dateModified:  term.updatedAt.toISOString().slice(0, 10),
            speakable: {
              "@type":     "SpeakableSpecification",
              // .glossary-short-def is rendered on the first <p> inside the
              // prose area of glossary-term.tsx (when body === shortDef).
              // Must stay in sync with the className on that element.
              cssSelector: [".glossary-short-def"],
            },
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: term.publishedAt.toISOString().slice(0, 10),
            dateModified:  term.updatedAt.toISOString().slice(0, 10),
            mainEntity: [
              {
                "@type": "Question",
                name:    `What is ${term.term}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    term.shortDef,
                },
              },
              {
                "@type": "Question",
                name:    `Why is ${term.term} important in fintech?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    `${term.term} is a key concept in financial technology${term.category ? ` within the ${term.category} sector` : ""}. Understanding ${term.term} helps fintech founders, marketers, and product teams communicate clearly with investors, regulators, and customers operating in the digital finance space.`,
                },
              },
            ],
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
          deliverables: servicesTable.deliverables,
        })
        .from(servicesTable)
        .where(eq(servicesTable.slug, slug))
        .limit(1);

      if (!svc) { res.status(404); return next(); }

      const canonical   = `${siteUrl}/services/${slug}`;
      const description = (svc.tagline ?? svc.description ?? `${svc.name} — FintechPressHub`).slice(0, 160);
      const title       = `${svc.name} | FintechPressHub`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(svc.name)}&category=Service`;

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["services", slug], svc.name);

      patches = {
        title,
        description,
        canonical,
        ogTitle:       svc.name,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${svc.name} — FintechPressHub`,
        extraLds: (() => {
          const lds: string[] = [
            JSON.stringify({
              "@context":   "https://schema.org",
              // FinancialService + ProfessionalService is the most precise dual-type
              // for fintech consultancy offerings — helps Google's Knowledge Graph
              // classify the entity correctly across both financial-services and
              // professional-services taxonomies, improving LLM entity recognition.
              "@type":      ["FinancialService", "ProfessionalService"],
              "@id":        canonical,
              name:         svc.name,
              description:  svc.tagline ?? svc.description ?? svc.name,
              url:          canonical,
              inLanguage:   "en",
              areaServed:   "Worldwide",
              // eligibleRegion strengthens international rich-result targeting by
              // explicitly declaring the geographic scope of service delivery.
              eligibleRegion: { "@type": "Place", name: "Worldwide" },
              // priceRange signals commercial intent to Google Knowledge Panel and
              // rich-result classification — without it, FinancialService is treated
              // as a generic entity with no pricing context.
              ...(SERVICE_PRICE_RANGE[slug] ? { priceRange: SERVICE_PRICE_RANGE[slug] } : {}),
              // datePublished/dateModified give Google a freshness signal for the
              // service entity itself (not just the WebPage companion), strengthening
              // E-E-A-T scoring for financial-service content.
              datePublished: STATIC_PAGE_CREATED["/services"] ?? "2021-01-01",
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              provider:     { "@id": `${siteUrl}#organization` },
              ...(Array.isArray(svc.deliverables) && svc.deliverables.length > 0
                ? {
                    hasOfferCatalog: {
                      "@type": "OfferCatalog",
                      name:    `${svc.name} — what's included`,
                      itemListElement: (svc.deliverables as string[]).map((d) => ({
                        "@type":       "Offer",
                        itemOffered:   { "@type": "Service", name: d },
                      })),
                    },
                  }
                : {}),
            }, null, 2),
            // WebPage entity emitted alongside FinancialService so Google can
            // resolve the page-level entity and track freshness independently —
            // mirrors the pattern used on tools and compare pages for consistent
            // entity resolution across all content-type detail pages site-wide.
            JSON.stringify({
              "@context":    "https://schema.org",
              "@type":       "WebPage",
              "@id":         `${canonical}#webpage`,
              url:           canonical,
              inLanguage:    "en",
              isPartOf:      { "@id": `${siteUrl}#website` },
              publisher:     { "@id": `${siteUrl}#organization` },
              // datePublished matches the pattern on tools, compare, blog, and
              // glossary pages — provides Google a freshness anchor for the
              // service entity and satisfies E-E-A-T's publication-date signal.
              datePublished: STATIC_PAGE_CREATED["/services"] ?? "2021-01-01",
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              // SpeakableSpecification targets the h1 headline — the most concise,
              // authoritative identifier for this service. Enables Google Assistant
              // voice answers and AEO snippet extraction for service-intent queries
              // ("what is fintech SEO", "how does guest posting work").
              speakable: {
                "@type":     "SpeakableSpecification",
                cssSelector: ["h1"],
              },
            }, null, 2),
          ];
          // FAQPage schema unlocks Google's FAQ rich result for service-intent
          // queries ("what is fintech content writing", "how does off-page SEO
          // work"). Only injected when static Q&As exist for the service slug —
          // avoids an empty FAQPage entity on any future unlisted service pages.
          const svcFaqs = SERVICE_FAQS[slug];
          if (svcFaqs && svcFaqs.length > 0) {
            lds.push(JSON.stringify({
              "@context":    "https://schema.org",
              "@type":       "FAQPage",
              "@id":         `${canonical}#faq`,
              url:           canonical,
              inLanguage:    "en",
              isPartOf:      { "@id": `${siteUrl}#website` },
              publisher:     { "@id": `${siteUrl}#organization` },
              datePublished: STATIC_PAGE_CREATED["/services"] ?? "2021-01-01",
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              mainEntity:  svcFaqs.map(({ question, answer }) => ({
                "@type": "Question",
                name:    question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            }, null, 2));
          }
          lds.push(buildBreadcrumbLd(breadcrumbs));
          return lds;
        })(),
      };
    }

    // ── /authors/:slug ───────────────────────────────────────────────────────
    const authorMatch = AUTHOR_RE.exec(reqPath);
    if (authorMatch) {
      const slug = authorMatch[1]!;
      const [author] = await db
        .select({
          name:            authorsTable.name,
          role:            authorsTable.role,
          shortBio:        authorsTable.shortBio,
          photo:           authorsTable.photo,
          social:          authorsTable.social,
          expertise:       authorsTable.expertise,
          credentials:     authorsTable.credentials,
          location:        authorsTable.location,
          yearsExperience: authorsTable.yearsExperience,
          createdAt:       authorsTable.createdAt,
          updatedAt:       authorsTable.updatedAt,
        })
        .from(authorsTable)
        .where(eq(authorsTable.slug, slug))
        .limit(1);

      if (!author) { res.status(404); return next(); }

      const canonical   = `${siteUrl}/authors/${slug}`;
      const description = author.shortBio.slice(0, 160);
      const title       = `${author.name} — ${author.role} | FintechPressHub`;
      const ogImage     = author.photo
        ? author.photo.startsWith("http")
          ? author.photo
          : `${siteUrl}${author.photo}`
        : `${siteUrl}/api/og?title=${encodeURIComponent(author.name)}&category=${encodeURIComponent(author.role ?? "Author")}`;
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
        // Open Graph profile namespace — required when og:type is "profile".
        // Parsed by Facebook and LinkedIn to enrich author social card previews
        // with structured name and username context beyond the bare og:title.
        ogProfileFirstName: author.name.split(" ")[0] ?? author.name,
        ogProfileLastName:  author.name.includes(" ")
          ? author.name.split(" ").slice(1).join(" ")
          : undefined,
        ogProfileUsername:  social.twitter
          ? social.twitter.replace(/^https?:\/\/(www\.)?twitter\.com\/|^@/i, "").split("/")[0]
          : undefined,
        // RSS autodiscovery link — injected server-side so feed readers and
        // AI crawlers that skip JavaScript can find the per-author feed.
        headLinks: [
          `  <link rel="alternate" type="application/rss+xml" title="${esc(`${author.name} — FintechPressHub`)}" href="${esc(`${siteUrl}/authors/${slug}/rss.xml`)}" />`,
        ],
        extraLds: (() => {
          const lds: string[] = [
            JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ProfilePage",
              "@id":      canonical,
              name:       title,
              url:        canonical,
              inLanguage: "en",
              // datePublished/dateModified enable Google's freshness ranking
              // signal for author profile pages — without them, Google has no
              // structured signal to determine when a profile was created or
              // last substantively changed, weakening E-E-A-T scoring.
              datePublished: author.createdAt.toISOString().slice(0, 10),
              dateModified:  author.updatedAt.toISOString().slice(0, 10),
              isPartOf:   { "@id": `${siteUrl}#website` },
              publisher:  { "@id": `${siteUrl}#organization` },
              // SpeakableSpecification enables voice-assistant extraction of the author
              // headline and bio for "who is [name]?" queries — an E-E-A-T discoverability
              // signal that mirrors speakable coverage applied to all other page types.
              speakable: {
                "@type":     "SpeakableSpecification",
                cssSelector: ["h1", ".author-bio"],
              },
              mainEntity: {
                "@type":      "Person",
                "@id":        `${canonical}#person`,
                name:         author.name,
                jobTitle:     author.role,
                description:  author.yearsExperience > 0
                  ? `${author.shortBio} ${author.yearsExperience} years of experience.`.slice(0, 500)
                  : author.shortBio.slice(0, 500),
                url:          canonical,
                image:        ogImage,
                worksFor:     { "@id": `${siteUrl}#organization` },
                employer:     { "@id": `${siteUrl}#organization` },
                sameAs: [social.linkedin, social.twitter, social.website].filter(Boolean),
                ...(Array.isArray(author.expertise) && author.expertise.length > 0
                  ? { knowsAbout: author.expertise }
                  : {}),
                ...(Array.isArray(author.credentials) && author.credentials.length > 0
                  ? { award: author.credentials }
                  : {}),
                ...(author.location
                  ? { address: { "@type": "PostalAddress", addressLocality: author.location } }
                  : {}),
              },
            }, null, 2),
          ];
          // FAQPage schema gives author pages a FAQ rich result opportunity for
          // queries like "who is [name]" and "what does [name] specialise in" —
          // two high-frequency question patterns for E-E-A-T author pages.
          // Q&As are generated dynamically from the author's stored profile data
          // so they remain accurate without any manual curation overhead.
          const expertiseList = Array.isArray(author.expertise) && author.expertise.length > 0
            ? (author.expertise as string[]).slice(0, 3).join(", ")
            : null;
          const authorFaqs = [
            {
              question: `Who is ${author.name}?`,
              answer: author.yearsExperience > 0
                ? `${author.shortBio.slice(0, 400)} ${author.name} brings ${author.yearsExperience} years of experience in financial services and fintech.`
                : author.shortBio.slice(0, 500),
            },
            {
              question: `What does ${author.name} specialise in?`,
              answer: [
                author.role ? `${author.name} works as a ${author.role} at FintechPressHub` : `${author.name} is a contributor at FintechPressHub`,
                expertiseList ? `, with specialist expertise in ${expertiseList}` : "",
                author.location ? `. Based in ${author.location}` : "",
                ".",
              ].join("").trim(),
            },
          ];
          lds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: author.createdAt.toISOString().slice(0, 10),
            dateModified:  author.updatedAt.toISOString().slice(0, 10),
            mainEntity:  authorFaqs.map(({ question, answer }) => ({
              "@type": "Question",
              name:    question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          }, null, 2));
          lds.push(buildBreadcrumbLd(breadcrumbs));
          return lds;
        })(),
      };
    }

    // ── /blog/category/:slug ─────────────────────────────────────────────────
    const categoryMatch = CATEGORY_RE.exec(reqPath);
    if (categoryMatch) {
      const slug    = categoryMatch[1]!;
      const catMeta = CATEGORY_META[slug];
      if (!catMeta) { res.status(404); return next(); }

      const canonical   = `${siteUrl}/blog/category/${slug}`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(catMeta.title.replace(" | FintechPressHub", ""))}&category=${encodeURIComponent(slug)}`;
      const leafLabel   = catMeta.title.replace(" | FintechPressHub", "");

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", "category", slug], leafLabel);

      // Fetch posts in this category for ItemList schema.
      const catPosts = await db
        .select({ slug: blogPostsTable.slug, title: blogPostsTable.title, category: blogPostsTable.category, noIndex: blogPostsTable.noIndex, publishedAt: blogPostsTable.publishedAt })
        .from(blogPostsTable)
        .where(lte(blogPostsTable.publishedAt, sql`now()`))
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(50);
      const filteredCatPosts = catPosts.filter(
        (p) => !p.noIndex && p.category?.toLowerCase().replace(/\s+/g, "-") === slug,
      );

      const extraLds: string[] = [
        JSON.stringify({
          "@context":   "https://schema.org",
          "@type":      "CollectionPage",
          "@id":        canonical,
          name:         catMeta.title,
          description:  catMeta.description,
          url:          canonical,
          inLanguage:   "en",
          isPartOf:     { "@type": "Blog", "@id": `${siteUrl}/blog#blog` },
          publisher:    { "@id": `${siteUrl}#organization` },
          datePublished: "2021-06-01",
          dateModified: (filteredCatPosts[0]?.publishedAt ?? new Date()).toISOString().slice(0, 10),
          ...(catMeta.about.length > 0
            ? { about: catMeta.about.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          // SpeakableSpecification enables voice-assistant extraction of the category hub
          // headline for "what is [category] in fintech?" queries — consistent with the
          // speakable treatment applied to all other hub and collection page types.
          speakable: {
            "@type":     "SpeakableSpecification",
            cssSelector: ["h1"],
          },
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (filteredCatPosts.length > 0) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "ItemList",
          name:       catMeta.title,
          numberOfItems: filteredCatPosts.length,
          itemListElement: filteredCatPosts.map((p, i) => ({
            "@type":    "ListItem",
            position:   i + 1,
            name:       p.title,
            url:        `${siteUrl}/blog/${p.slug}`,
          })),
        }, null, 2));
      }

      patches = {
        title:         catMeta.title,
        description:   catMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: catMeta.description,
        ogImage,
        ogImageAlt:    catMeta.title,
        extraLds,
        // Announce the category RSS feed so RSS readers and Googlebot can
        // discover per-category feeds without visiting /blog/category/:slug first.
        headLinks: [
          `  <link rel="alternate" type="application/rss+xml" title="${esc(`${leafLabel} — FintechPressHub`)}" href="${esc(`${siteUrl}/blog/category/${slug}/rss.xml`)}" />`,
        ],
      };
    }

    // ── /blog/tag/:slug ──────────────────────────────────────────────────────
    const tagMatch = TAG_RE.exec(reqPath);
    if (tagMatch) {
      const rawTag  = tagMatch[1]!;
      // Slugs use hyphens; display labels restore spaces/capitalisation.
      const tagLabel = rawTag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const canonical  = `${siteUrl}/blog/tag/${rawTag}`;
      const ogImage    = `${siteUrl}/api/og?title=${encodeURIComponent(tagLabel)}&category=${encodeURIComponent("Tag")}`;
      const title      = `${tagLabel} Articles | FintechPressHub`;
      const description = `Browse all FintechPressHub articles tagged with "${tagLabel}" — expert fintech SEO, content marketing, and industry analysis.`;
      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", "tag", rawTag], tagLabel);

      // Fetch posts containing this tag. We pull all recent posts and
      // filter in JS because Drizzle ORM lacks a native JSONB @> operator
      // binding for string arrays; a full-table scan is acceptable here
      // since posts are cached after the first SSR hit per slug.
      const tagPosts = await db
        .select({
          slug:        blogPostsTable.slug,
          title:       blogPostsTable.title,
          tags:        blogPostsTable.tags,
          noIndex:     blogPostsTable.noIndex,
          publishedAt: blogPostsTable.publishedAt,
        })
        .from(blogPostsTable)
        .where(lte(blogPostsTable.publishedAt, sql`now()`))
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(200);

      const filteredTagPosts = tagPosts.filter(
        (p) =>
          !p.noIndex &&
          Array.isArray(p.tags) &&
          (p.tags as string[]).some(
            (t: string) => t.toLowerCase().replace(/\s+/g, "-") === rawTag,
          ),
      );

      if (filteredTagPosts.length === 0) { res.status(404); return next(); }

      const extraLds: string[] = [
        JSON.stringify({
          "@context":   "https://schema.org",
          "@type":      "CollectionPage",
          "@id":        canonical,
          url:          canonical,
          name:         title,
          description,
          inLanguage:   "en",
          isPartOf:     { "@type": "Blog", "@id": `${siteUrl}/blog#blog` },
          publisher:    { "@id": `${siteUrl}#organization` },
          datePublished: "2021-06-01",
          dateModified: (filteredTagPosts[0]?.publishedAt ?? new Date()).toISOString().slice(0, 10),
          keywords:     tagLabel,
          // SpeakableSpecification enables voice-assistant extraction of the tag hub headline
          // for queries like "what is [tag]?" — mirrors the speakable coverage applied to
          // all category, hub, and collection page types across the site.
          speakable: {
            "@type":     "SpeakableSpecification",
            cssSelector: ["h1"],
          },
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (filteredTagPosts.length > 0) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "ItemList",
          name:       `${tagLabel} Articles`,
          url:        canonical,
          numberOfItems: filteredTagPosts.slice(0, 20).length,
          itemListElement: filteredTagPosts.slice(0, 20).map((p, i) => ({
            "@type":    "ListItem",
            position:   i + 1,
            name:       p.title,
            url:        `${siteUrl}/blog/${p.slug}`,
          })),
        }, null, 2));
      }

      patches = {
        title,
        description,
        canonical,
        ogTitle:       `${tagLabel} Articles`,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${tagLabel} — FintechPressHub`,
        extraLds,
        // Announce the per-tag RSS feed so feed readers and AI crawlers can
        // discover and subscribe to tag-scoped content without visiting the
        // tag hub page first — mirrors the autodiscovery already present on
        // category hub pages for consistent discoverability across both
        // content-organisation dimensions.
        headLinks: [
          `  <link rel="alternate" type="application/rss+xml" title="${esc(`${tagLabel} Articles — FintechPressHub`)}" href="${esc(`${siteUrl}/blog/tag/${rawTag}/rss.xml`)}" />`,
        ],
      };
    }

    // ── /compare/:slug ───────────────────────────────────────────────────────
    const compareMatch = COMPARE_RE.exec(reqPath);
    if (compareMatch) {
      const slug     = compareMatch[1]!;
      const cmpMeta  = COMPARISON_META[slug];
      if (!cmpMeta) { res.status(404); return next(); }

      const canonical  = `${siteUrl}/compare/${slug}`;
      const leafLabel  = cmpMeta.title.split("|")[0]!.trim();
      const breadcrumbs = buildCrumbsForPath(siteUrl, ["compare", slug], leafLabel);

      // FAQPage schema enables FAQ rich results for comparison queries.
      // The primary comparison question is supplemented with extra Q&As from
      // COMPARE_FAQ_EXTRAS so each page qualifies for featured-snippet display.
      const extraFaqs = COMPARE_FAQ_EXTRAS[slug] ?? [];
      const faqMainEntity = [
        {
          "@type": "Question",
          name:    leafLabel,
          acceptedAnswer: { "@type": "Answer", text: cmpMeta.description },
        },
        ...extraFaqs.map((faq) => ({
          "@type": "Question",
          name:    faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      ];

      patches = {
        title:         cmpMeta.title,
        description:   cmpMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: cmpMeta.description,
        ogImage:       `${siteUrl}/api/og?title=${encodeURIComponent(leafLabel)}&category=Compare`,
        ogImageAlt:    leafLabel,
        extraLds: [
          JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "FAQPage",
            // #faq fragment is consistent with every other FAQPage entity on
            // the site (blog, author, glossary, service, pricing, tools,
            // location all use canonical#faq). The bare canonical URL is
            // reserved for the primary WebPage entity's @id.
            "@id":       `${canonical}#faq`,
            name:        cmpMeta.title,
            url:         canonical,
            inLanguage:  "en",
            // isPartOf mirrors the pattern on all 7 other FAQPage entities.
            // Without it Google cannot resolve this entity within the site
            // entity graph and may discount the FAQ accordion rich-result.
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            datePublished: STATIC_PAGE_CREATED["/compare"] ?? "2024-09-01",
            ...(COMPARE_PAGE_LASTMOD[slug] ? { dateModified: COMPARE_PAGE_LASTMOD[slug] } : {}),
            mainEntity: faqMainEntity,
          }, null, 2),
          // WebPage entity emitted alongside FAQPage so Google can resolve the
          // page-level entity and track freshness — matches the pattern used on
          // blog posts and glossary terms for consistent entity resolution.
          JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        `${canonical}#webpage`,
            url:          canonical,
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            datePublished: STATIC_PAGE_CREATED["/compare"] ?? "2024-09-01",
            ...(COMPARE_PAGE_LASTMOD[slug] ? { dateModified: COMPARE_PAGE_LASTMOD[slug] } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the comparison
            // headline for queries like "agency vs in-house SEO" — mirrors the speakable
            // coverage on service detail pages and other decision-intent pages.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
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
      if (!toolMeta) { res.status(404); return next(); }

      const canonical  = `${siteUrl}/tools/${slug}`;
      const leafLabel  = toolMeta.title.split("|")[0]!.trim();
      const breadcrumbs = buildCrumbsForPath(siteUrl, ["tools", slug], leafLabel);

      const toolExtraLds: string[] = [
        JSON.stringify({
          "@context":           "https://schema.org",
          "@type":              "SoftwareApplication",
          "@id":                canonical,
          name:                 leafLabel,
          description:          toolMeta.description,
          url:                  canonical,
          inLanguage:           "en",
          applicationCategory:  "FinanceApplication",
          operatingSystem:      "Web",
          isAccessibleForFree:  true,
          offers: {
            "@type":        "Offer",
            price:          "0",
            priceCurrency:  "USD",
          },
          provider:      { "@id": `${siteUrl}#organization` },
          datePublished: STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
          ...(TOOL_PAGE_LASTMOD[slug] ? { dateModified: TOOL_PAGE_LASTMOD[slug] } : {}),
          potentialAction: { "@type": "UseAction", target: canonical },
          ...(TOOLS_FEATURE_LIST[slug] ? { featureList: TOOLS_FEATURE_LIST[slug] } : {}),
        }, null, 2),
      ];
      const howTo = TOOLS_HOWTO[slug];
      if (howTo) {
        toolExtraLds.push(JSON.stringify({
          "@context":  "https://schema.org",
          "@type":     "HowTo",
          "@id":       `${canonical}#howto`,
          name:        howTo.name,
          description: howTo.description,
          ...(howTo.totalTime ? { totalTime: howTo.totalTime } : {}),
          tool: { "@type": "HowToTool", name: leafLabel },
          step: howTo.steps.map((s, i) => ({
            "@type":   "HowToStep",
            position:  i + 1,
            name:      s.name,
            text:      s.text,
          })),
        }, null, 2));
      }
      // FAQPage schema runs alongside SoftwareApplication + HowTo to occupy
      // a separate rich-result slot (expandable FAQ accordion) in Google SERPs.
      // Three Q&As per tool: (1) free-access confirmation, (2) primary use-case,
      // (3) tool-specific expert tip — matching the pattern used on compare,
      // glossary, service, and location pages for consistent FAQ coverage.
      const toolFaqs = TOOLS_FAQ[slug];
      if (toolFaqs && toolFaqs.length > 0) {
        toolExtraLds.push(JSON.stringify({
          "@context":  "https://schema.org",
          "@type":     "FAQPage",
          "@id":       `${canonical}#faq`,
          name:        `${leafLabel} — Frequently Asked Questions`,
          url:         canonical,
          inLanguage:  "en",
          isPartOf:    { "@id": `${siteUrl}#website` },
          publisher:   { "@id": `${siteUrl}#organization` },
          datePublished: STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
          ...(TOOL_PAGE_LASTMOD[slug] ? { dateModified: TOOL_PAGE_LASTMOD[slug] } : {}),
          mainEntity: toolFaqs.map(({ question, answer }) => ({
            "@type": "Question",
            name:    question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }, null, 2));
      }
      // WebPage entity emitted alongside SoftwareApplication so Google can
      // resolve the page-level entity and track freshness independently of
      // the application content entity — mirrors the pattern used on blog posts
      // and glossary terms to keep entity resolution consistent site-wide.
      toolExtraLds.push(JSON.stringify({
        "@context":   "https://schema.org",
        "@type":      "WebPage",
        "@id":        `${canonical}#webpage`,
        url:          canonical,
        name:         leafLabel,
        description:  toolMeta.description,
        inLanguage:   "en",
        isPartOf:     { "@id": `${siteUrl}#website` },
        publisher:    { "@id": `${siteUrl}#organization` },
        datePublished: STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
        ...(TOOL_PAGE_LASTMOD[slug] ? { dateModified: TOOL_PAGE_LASTMOD[slug] } : {}),
        // SpeakableSpecification enables voice-assistant extraction of the tool description
        // for "how does [tool] work?" queries — mirrors the speakable coverage applied to
        // all other page types site-wide including compare, service, and blog detail pages.
        speakable: {
          "@type":     "SpeakableSpecification",
          cssSelector: ["h1", ".speakable-summary"],
        },
      }, null, 2));
      toolExtraLds.push(buildBreadcrumbLd(breadcrumbs));

      patches = {
        title:         toolMeta.title,
        description:   toolMeta.description,
        canonical,
        ogTitle:       leafLabel,
        ogDescription: toolMeta.description,
        ogImage:       `${siteUrl}/api/og?title=${encodeURIComponent(leafLabel)}&category=Tools`,
        ogImageAlt:    leafLabel,
        extraLds:      toolExtraLds,
      };
    }

    // ── Static pages ─────────────────────────────────────────────────────────
    // Matches exact paths like /, /about, /pricing, /blog, /glossary, etc.
    // Runs after dynamic routes so a slug-based route always wins.
    if (!patches) {
      const staticMeta = STATIC_META[reqPath];
      if (staticMeta) {
        const canonical   = `${siteUrl}${reqPath === "/" ? "/" : reqPath}`;
        const ogMeta      = STATIC_OG_META[reqPath];
        const ogImage     = ogMeta
          ? `${siteUrl}/api/og?title=${encodeURIComponent(ogMeta.ogTitle)}&category=${encodeURIComponent(ogMeta.category)}`
          : `${siteUrl}/opengraph.jpg`;
        const segments    = reqPath === "/" ? [] : reqPath.split("/").filter(Boolean);
        const leafLabel   = staticMeta.title.split("|")[0]!.trim();
        const breadcrumbs = buildCrumbsForPath(siteUrl, segments, leafLabel);

        const pageLastmod = STATIC_PAGE_LASTMOD[reqPath];

        // Build page-type-specific JSON-LD schemas for key hub pages.
        const extraLds: string[] = [];

        if (reqPath === "/about") {
          // ── /about — rich AboutPage with employee list ──────────────────
          const aboutAuthors = await db
            .select({ name: authorsTable.name, role: authorsTable.role, slug: authorsTable.slug })
            .from(authorsTable)
            .orderBy(asc(authorsTable.name))
            .limit(20);
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "AboutPage",
            "@id":        canonical,
            url:          canonical,
            inLanguage:   "en",
            name:         staticMeta.title,
            description:  staticMeta.description,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2021-01-01",
            dateModified: pageLastmod ?? "2026-05-09",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification targets the h1 and the .speakable-summary paragraph
            // (the agency description rendered in about.tsx PageHero) — the most concise
            // authority summary. Enables Google Assistant / Siri voice excerpts and AEO
            // snippet extraction for "who is FintechPressHub?" queries.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary"],
            },
            ...(aboutAuthors.length > 0
              ? {
                  employee: aboutAuthors.map((a) => ({
                    "@type":    "Person",
                    name:       a.name,
                    jobTitle:   a.role,
                    url:        `${siteUrl}/authors/${a.slug}`,
                  })),
                }
              : {}),
          }, null, 2));

        } else if (reqPath === "/blog") {
          // ── /blog hub — CollectionPage + ItemList of recent posts ────────
          const hubPosts = await db
            .select({ slug: blogPostsTable.slug, title: blogPostsTable.title, noIndex: blogPostsTable.noIndex, publishedAt: blogPostsTable.publishedAt })
            .from(blogPostsTable)
            .where(lte(blogPostsTable.publishedAt, sql`now()`))
            .orderBy(desc(blogPostsTable.publishedAt))
            .limit(20);
          const visibleHubPosts = hubPosts.filter((p) => !p.noIndex);
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2021-06-01",
            dateModified: (visibleHubPosts[0]?.publishedAt ?? new Date()).toISOString().slice(0, 10),
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification enables voice-assistant extraction of the blog hub
            // headline for queries like "what does FintechPressHub write about?" and
            // powers AEO snippet extraction by Perplexity, ChatGPT Search, and Claude.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));
          // Blog entity — defines the canonical #blog @id referenced by BlogPosting.isPartOf
          // and CollectionPage.isPartOf throughout the site. Without this entity block,
          // Google's Knowledge Graph treats #blog as an unresolved dangling reference that
          // cannot be classified or disambiguated. Periodical co-type signals that the blog
          // is a regularly updated publication, boosting Google News eligibility.
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      ["Blog", "Periodical"],
            "@id":        `${siteUrl}/blog#blog`,
            url:          `${siteUrl}/blog`,
            name:         "FintechPressHub Blog",
            description:  staticMeta.description,
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
          }, null, 2));
          if (visibleHubPosts.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Latest Fintech Articles",
              numberOfItems: visibleHubPosts.length,
              itemListElement: visibleHubPosts.map((p, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       p.title,
                url:        `${siteUrl}/blog/${p.slug}`,
              })),
            }, null, 2));
          }

        } else if (reqPath === "/authors") {
          // ── /authors hub — ItemList of all author profiles ────────────────
          const hubAuthors = await db
            .select({ name: authorsTable.name, slug: authorsTable.slug, role: authorsTable.role })
            .from(authorsTable)
            .orderBy(asc(authorsTable.name))
            .limit(30);
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2021-06-01",
            dateModified: pageLastmod ?? "2026-05-09",
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification enables voice-assistant extraction of the authors hub
            // headline for queries like "who writes for FintechPressHub?" — strengthens
            // E-E-A-T discoverability for the author entity graph as a whole.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));
          if (hubAuthors.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Our Contributors & Expert Authors",
              numberOfItems: hubAuthors.length,
              itemListElement: hubAuthors.map((a, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       `${a.name} — ${a.role}`,
                url:        `${siteUrl}/authors/${a.slug}`,
              })),
            }, null, 2));
          }

        } else if (reqPath === "/services") {
          // ── /services hub — ItemList of all service pages ─────────────────
          const hubServices = await db
            .select({ name: servicesTable.name, slug: servicesTable.slug, tagline: servicesTable.tagline })
            .from(servicesTable)
            .orderBy(asc(servicesTable.name))
            .limit(20);
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2021-06-01",
            dateModified: pageLastmod ?? "2026-05-09",
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification targets h1 and the .speakable-summary paragraph
            // (rendered in services.tsx PageHero) — the value-proposition summary for
            // "best fintech SEO agency" and "fintech content marketing services" queries.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary"],
            },
          }, null, 2));
          if (hubServices.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech Content Marketing Services",
              numberOfItems: hubServices.length,
              itemListElement: hubServices.map((s, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       s.tagline ? `${s.name} — ${s.tagline}` : s.name,
                url:        `${siteUrl}/services/${s.slug}`,
              })),
            }, null, 2));
          }

        } else if (reqPath === "/pricing") {
          // ── /pricing — ItemList of retainer pricing plans ─────────────────
          const pricingList = await db
            .select({
              name:         pricingPlansTable.name,
              tagline:      pricingPlansTable.tagline,
              priceMonthly: pricingPlansTable.priceMonthly,
              priceUnit:    pricingPlansTable.priceUnit,
              description:  pricingPlansTable.description,
              sortOrder:    pricingPlansTable.sortOrder,
            })
            .from(pricingPlansTable)
            .orderBy(asc(pricingPlansTable.sortOrder))
            .catch(() => [] as Array<{ name: string; tagline: string; priceMonthly: number; priceUnit: string; description: string; sortOrder: number }>);
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        canonical,
            url:          canonical,
            inLanguage:   "en",
            name:         staticMeta.title,
            description:  staticMeta.description,
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification targets h1 and the .speakable-summary paragraph
            // (rendered in pricing.tsx PageHero) — enables voice assistants to surface
            // the pricing value proposition as spoken answers to "how much does fintech
            // SEO cost?" and "fintech SEO agency pricing" queries.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary"],
            },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          if (pricingList.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO Pricing Plans",
              url:        canonical,
              numberOfItems: pricingList.length,
              itemListElement: pricingList.map((plan, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       plan.tagline ? `${plan.name} — ${plan.tagline}` : plan.name,
                url:        `${canonical}#${plan.name.toLowerCase().replace(/\s+/g, "-")}`,
                item: {
                  "@type":         "Offer",
                  name:            plan.name,
                  description:     plan.description.slice(0, 300),
                  ...(plan.priceMonthly > 0
                    ? { price: plan.priceMonthly, priceCurrency: "USD", billingPeriod: "P1M" }
                    : {}),
                  availability:    "https://schema.org/InStock",
                  seller:          { "@id": `${siteUrl}#organization` },
                },
              })),
            }, null, 2));
          }

          // ── FAQPage for /pricing (unlocks featured snippet real estate) ──
          // Mirrors PRICING_FAQS module-level constant; keep both in sync when
          // editing Q&A content in pricing.tsx.
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            name:          "FintechPressHub Pricing FAQ",
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2023-01-01",
            dateModified:  pageLastmod ?? "2026-05-09",
            mainEntity: PRICING_FAQS.map(({ question, answer }) => ({
              "@type": "Question",
              name:    question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          }, null, 2));

          // HowTo schema for /pricing — unlocks Google's step-by-step rich result
          // for "how to start fintech SEO" / "how to hire a fintech SEO agency"
          // queries. Four clear steps match the actual client onboarding journey.
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "HowTo",
            "@id":       `${canonical}#howto`,
            name:        "How to Get Started with FintechPressHub Fintech SEO",
            description: "A step-by-step guide to starting a fintech SEO or content marketing retainer with FintechPressHub.",
            step: [
              {
                "@type":  "HowToStep",
                position: 1,
                name:     "Choose your plan",
                text:     "Review the Starter, Growth, Authority, and Enterprise retainer plans. Most clients begin with Growth for a balanced mix of content production and link-building.",
              },
              {
                "@type":  "HowToStep",
                position: 2,
                name:     "Book a free strategy call",
                text:     "Complete the contact form to schedule a 30-minute call with a FintechPressHub strategist. We will audit your current search footprint and recommend the right plan.",
              },
              {
                "@type":  "HowToStep",
                position: 3,
                name:     "Receive your onboarding pack",
                text:     "Within 3 business days of signing, you will receive a detailed onboarding questionnaire, access to your client dashboard, and your first content brief.",
              },
              {
                "@type":  "HowToStep",
                position: 4,
                name:     "Review your first deliverables",
                text:     "Your strategist delivers the first batch of articles and link-building placements within 30 days. You review, approve, and we publish to your CMS.",
              },
            ],
          }, null, 2));

        } else if (reqPath === "/glossary") {
          // ── /glossary hub — DefinedTermSet + ItemList from DB ────────────
          const hubTerms = await db
            .select({
              slug:     glossaryTermsTable.slug,
              term:     glossaryTermsTable.term,
              shortDef: glossaryTermsTable.shortDef,
            })
            .from(glossaryTermsTable)
            .orderBy(asc(glossaryTermsTable.term))
            .limit(30)
            .catch(() => [] as Array<{ slug: string; term: string; shortDef: string }>);
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "DefinedTermSet",
            "@id":        canonical,
            url:          canonical,
            name:         "Fintech Glossary",
            description:  staticMeta.description,
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the glossary hub
            // headline for queries like "what is a fintech glossary?" — reinforces the
            // DefinedTermSet entity for Google's Knowledge Graph vocabulary signals.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));
          if (hubTerms.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech Glossary Terms",
              url:        canonical,
              numberOfItems: hubTerms.length,
              itemListElement: hubTerms.map((t, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       `${t.term}: ${t.shortDef.slice(0, 80)}`,
                url:        `${siteUrl}/glossary/${t.slug}`,
              })),
            }, null, 2));
          }

        } else if (reqPath === "/tools") {
          // ── /tools hub — CollectionPage + ItemList ────────────────────────
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification targets h1 — the clearest spoken answer for
            // "what free fintech marketing tools are available?" queries. No tagline
            // paragraph exists on the tools hub, so h1-only is the correct selector.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ItemList",
            name:       "Free Fintech Marketing Tools",
            url:        canonical,
            numberOfItems: Object.keys(TOOLS_META).length,
            itemListElement: Object.entries(TOOLS_META).map(([toolSlug, meta], i) => ({
              "@type":     "ListItem",
              position:    i + 1,
              name:        meta.title.split("|")[0]!.trim(),
              description: meta.description.slice(0, 120),
              url:         `${siteUrl}/tools/${toolSlug}`,
            })),
          }, null, 2));

        } else if (reqPath === "/compare") {
          // ── /compare hub — CollectionPage + ItemList ──────────────────────
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification targets h1 — the clearest spoken answer for
            // "FintechPressHub vs X" queries. No tagline paragraph exists on the
            // compare hub, so h1-only is the correct selector.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ItemList",
            name:       "Fintech SEO Agency Comparisons",
            url:        canonical,
            numberOfItems: Object.keys(COMPARISON_META).length,
            itemListElement: Object.entries(COMPARISON_META).map(([cmpSlug, meta], i) => ({
              "@type":     "ListItem",
              position:    i + 1,
              name:        meta.title.split("|")[0]!.trim(),
              description: meta.description.slice(0, 120),
              url:         `${siteUrl}/compare/${cmpSlug}`,
            })),
          }, null, 2));

        } else if (reqPath === "/contact") {
          // ── /contact — ContactPage + Organization contactPoint ────────────
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "ContactPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the contact
            // page headline for queries like "how do I contact FintechPressHub?" —
            // ensures the CTA and contact method are surfaceable via AEO channels.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            mainEntity: {
              "@type":  "Organization",
              "@id":    `${siteUrl}#organization`,
              name:     "FintechPressHub",
              url:      siteUrl,
              email:    "hello@fintechpresshub.com",
              contactPoint: {
                "@type":       "ContactPoint",
                contactType:   "customer service",
                url:           canonical,
                email:         "hello@fintechpresshub.com",
                availableLanguage: { "@type": "Language", name: "English", alternateName: "en" },
              },
            },
          }, null, 2));

        } else if (reqPath === "/write-for-us") {
          // ── /write-for-us — CollectionPage + WriteAction ──────────────────
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the write-for-us
            // headline for queries like "how to write for FintechPressHub?" — surfaces the
            // guest-post opportunity to AI citation engines and voice-search results.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            potentialAction: {
              "@type":  "WriteAction",
              name:     "Submit a Guest Post Pitch",
              target:   canonical,
              object: {
                "@type":    "Article",
                inLanguage: "en",
                about:      { "@type": "Thing", name: "Fintech SEO and content marketing" },
              },
            },
          }, null, 2));

          // FAQPage — write-for-us FAQ rich results target queries such as
          // "how to write for FintechPressHub", "do you accept AI articles",
          // "what fintech topics do you publish" and "is there a dofollow link".
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            name:          "Write For Us — Frequently Asked Questions",
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2023-01-01",
            dateModified:  pageLastmod ?? "2026-05-11",
            mainEntity: [
              {
                "@type": "Question",
                name:    "What types of fintech content does FintechPressHub accept?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    "We publish expert-level content covering fintech SEO, payments infrastructure, open banking, embedded finance, lending, regtech, and wealthtech. Articles must be original, human-written, and targeted at a professional audience of founders, marketers, and operators — not general consumer finance content.",
                },
              },
              {
                "@type": "Question",
                name:    "Do guest contributors receive a dofollow backlink?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    "Yes. Accepted guest posts include one permanent, dofollow editorial link to your company website or a relevant resource. The link must be contextually relevant and placed naturally within the article — not in the author bio. Sponsored-content link placements are handled separately under our content partnership programme.",
                },
              },
              {
                "@type": "Question",
                name:    "Does FintechPressHub accept AI-generated content?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    "No. We require human-written, expert-led content that meets our editorial guidelines on accuracy, sourcing, and E-E-A-T. AI-assisted research and outline drafting are permitted, but the final article must reflect the author's genuine expertise and original analysis. Submissions that appear AI-generated are rejected without review.",
                },
              },
            ],
          }, null, 2));

        } else if (reqPath === "/resources/fintech-publications") {
          // ── /resources/fintech-publications — CollectionPage + ItemList ───
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the publications
            // hub headline for queries like "which fintech publications should I target?" —
            // surfaces this high-value link-building resource via AEO channels.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));
          const FINTECH_PUBS = [
            { name: "Finextra", url: "https://www.finextra.com" },
            { name: "The Fintech Times", url: "https://thefintechtimes.com" },
            { name: "Tearsheet", url: "https://tearsheet.co" },
            { name: "Finovate", url: "https://finovate.com" },
            { name: "PYMNTS", url: "https://www.pymnts.com" },
            { name: "FinanceMagnates", url: "https://www.financemagnates.com" },
            { name: "AltFi", url: "https://www.altfi.com" },
            { name: "Global Finance Magazine", url: "https://gfmag.com" },
            { name: "Banking Technology", url: "https://www.bankingtech.com" },
            { name: "Fintechist", url: "https://fintechist.com" },
          ];
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ItemList",
            name:       "Top Fintech Publications for Guest Posting & Link Building",
            url:        canonical,
            numberOfItems: FINTECH_PUBS.length,
            itemListElement: FINTECH_PUBS.map((pub, i) => ({
              "@type":    "ListItem",
              position:   i + 1,
              name:       pub.name,
              url:        pub.url,
            })),
          }, null, 2));

        } else if (reqPath === "/locations") {
          // ── /locations hub — CollectionPage + ItemList from DB ───────────
          const hubLocations = await db
            .select({
              slug:    locationPagesTable.slug,
              city:    locationPagesTable.city,
              region:  locationPagesTable.region,
              country: locationPagesTable.country,
              headline: locationPagesTable.headline,
            })
            .from(locationPagesTable)
            .orderBy(asc(locationPagesTable.country), asc(locationPagesTable.city))
            .catch(() => [] as Array<{ slug: string; city: string; region: string | null; country: string; headline: string }>);
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "CollectionPage",
            "@id":        canonical,
            url:          canonical,
            name:         staticMeta.title,
            description:  staticMeta.description,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2025-01-01",
            dateModified: pageLastmod ?? "2026-05-10",
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification enables voice-assistant extraction of the locations hub
            // headline for queries like "where does FintechPressHub offer SEO services?" —
            // ensures AI citation engines can surface geo-targeted service coverage.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));
          if (hubLocations.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO Locations",
              url:        canonical,
              numberOfItems: hubLocations.length,
              itemListElement: hubLocations.map((loc, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       loc.region
                  ? `${loc.city}, ${loc.region}, ${loc.country}`
                  : `${loc.city}, ${loc.country}`,
                description: loc.headline,
                url:        `${siteUrl}/locations/${loc.slug}`,
              })),
            }, null, 2));
          }

        } else if (reqPath === "/press") {
          // ── /press — CollectionPage with brand/media asset focus ──────────
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            about:       { "@id": `${siteUrl}#organization` },
            // SpeakableSpecification enables voice-assistant extraction of the press hub
            // headline for queries like "has FintechPressHub been featured in the press?" —
            // surfaces the brand's media credibility to AI citation engines.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
          }, null, 2));

          // Inject real press mentions from DB as an ItemList of NewsArticle
          // references. Gives Google structured evidence that FintechPressHub
          // has been covered by named publications — strengthening E-E-A-T.
          const mentions = await db
            .select({
              title:       pressMentionsTable.title,
              publication: pressMentionsTable.publication,
              url:         pressMentionsTable.url,
              year:        pressMentionsTable.year,
            })
            .from(pressMentionsTable)
            .orderBy(asc(pressMentionsTable.sortOrder))
            .catch(() => [] as Array<{ title: string; publication: string; url: string; year: string }>);

          if (mentions.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "FintechPressHub Press Mentions",
              url:        canonical,
              numberOfItems: mentions.length,
              itemListElement: mentions.map((m, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                item: {
                  "@type":       "NewsArticle",
                  headline:      m.title,
                  url:           m.url,
                  datePublished: m.year,
                  publisher: {
                    "@type": "Organization",
                    name:    m.publication,
                  },
                  about: { "@id": `${siteUrl}#organization` },
                },
              })),
            }, null, 2));
          }

        } else if (reqPath === "/") {
          // ── Homepage — WebPage + services ItemList + AggregateRating for crawler discoverability
          // The index.html already carries the WebSite + Organization @graph;
          // here we add a page-level WebPage entity, a quick-glance ItemList
          // of service offerings, and an AggregateRating from live testimonials
          // so crawlers (and LLMs) can classify the site without executing JavaScript.
          const [homeServices, homeTestimonials] = await Promise.all([
            db
              .select({ name: servicesTable.name, slug: servicesTable.slug, tagline: servicesTable.tagline })
              .from(servicesTable)
              .orderBy(asc(servicesTable.name))
              .limit(10)
              .catch(() => [] as Array<{ name: string; slug: string; tagline: string }>),
            db
              .select({
                rating:  testimonialsTable.rating,
                name:    testimonialsTable.name,
                quote:   testimonialsTable.quote,
                company: testimonialsTable.company,
                role:    testimonialsTable.role,
              })
              .from(testimonialsTable)
              .catch(() => [] as Array<{ rating: number; name: string; quote: string; company: string; role: string }>),
          ]);
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        canonical,
            url:          canonical,
            name:         staticMeta.title,
            description:  staticMeta.description,
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification targets h1, the .speakable-summary paragraph,
            // and the .hero-description paragraph (both classes are on the same <p>
            // in home.tsx) — enables voice assistants to surface the most concise
            // agency description for "what is FintechPressHub?" and
            // "best fintech SEO agency" queries — the highest-traffic intent patterns.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary", ".hero-description"],
            },
          }, null, 2));
          if (homeServices.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO & Content Marketing Services",
              url:        canonical,
              numberOfItems: homeServices.length,
              itemListElement: homeServices.map((s, i) => ({
                "@type":       "ListItem",
                position:      i + 1,
                name:          s.tagline ? `${s.name} — ${s.tagline}` : s.name,
                url:           `${siteUrl}/services/${s.slug}`,
                ...(s.tagline ? { description: s.tagline } : {}),
              })),
            }, null, 2));
          }

          // AggregateRating — computed from live testimonials so Google can
          // display star ratings for commercial-intent queries like
          // "fintech SEO agency reviews". Falls back gracefully when no
          // testimonials are seeded.
          if (homeTestimonials.length > 0) {
            const ratingSum = homeTestimonials.reduce((s, t) => s + t.rating, 0);
            const ratingValue = (ratingSum / homeTestimonials.length).toFixed(1);
            // Include up to 5 Review entities — Google uses these alongside
            // AggregateRating to qualify pages for star-rating rich results.
            const reviewEntities = homeTestimonials.slice(0, 5).map((t) => ({
              "@type":       "Review",
              author:        { "@type": "Person", name: t.name },
              reviewBody:    t.quote,
              reviewRating:  {
                "@type":      "Rating",
                ratingValue:  t.rating,
                bestRating:   5,
                worstRating:  1,
              },
              ...(t.company ? { publisher: { "@type": "Organization", name: t.company } } : {}),
            }));
            extraLds.push(JSON.stringify({
              "@context":   "https://schema.org",
              "@type":      "ProfessionalService",
              "@id":        `${siteUrl}#service`,
              name:         "FintechPressHub",
              url:          siteUrl,
              description:  staticMeta.description,
              provider:     { "@id": `${siteUrl}#organization` },
              aggregateRating: {
                "@type":       "AggregateRating",
                ratingValue,
                bestRating:    "5",
                worstRating:   "1",
                ratingCount:   homeTestimonials.length,
                reviewCount:   homeTestimonials.length,
              },
              review: reviewEntities,
            }, null, 2));
          }

        } else {
          // ── All other static pages — generic WebPage schema ───────────────
          const pageCreated = STATIC_PAGE_CREATED[reqPath];
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        canonical,
            url:          canonical,
            name:         staticMeta.title,
            description:  staticMeta.description,
            // inLanguage is required for consistency — all specific page schemas include it;
            // this catch-all serves /privacy-policy, /refund-policy, /cookie-policy,
            // /terms, /editorial-guidelines, /community-guidelines, etc.
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(pageCreated ? { datePublished: pageCreated } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
        }

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
          ogImageAlt:    leafLabel,
          ogType:        staticMeta.ogType,
          extraLds,
        };
      }
    }

    if (!patches) return next();

    // Only cache DB-backed dynamic routes (static page patches are already cheap).
    const isDynamic =
      BLOG_RE.test(reqPath) || LOCATION_RE.test(reqPath) || GLOSSARY_RE.test(reqPath) ||
      SERVICE_RE.test(reqPath) || AUTHOR_RE.test(reqPath) || CATEGORY_RE.test(reqPath) ||
      TAG_RE.test(reqPath);
    if (isDynamic) setSsrMetaCached(reqPath, patches);

    const html = patchHtml(baseHtml, patches);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
    // Both rel="canonical" (Bing HTTP-header canonical) and rel="cite-as"
    // (W3C AI citation standard) in one Link header — covers all crawler types.
    res.setHeader("Link", `<${patches.canonical}>; rel="canonical", <${patches.canonical}>; rel="cite-as"`);
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
  if (process.env.NODE_ENV !== "production" && !process.env.SSR_META_DEV) return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const reqPath = req.path;

  const matchesDynamicRoute =
    BLOG_RE.test(reqPath) ||
    LOCATION_RE.test(reqPath) ||
    GLOSSARY_RE.test(reqPath) ||
    SERVICE_RE.test(reqPath) ||
    AUTHOR_RE.test(reqPath) ||
    CATEGORY_RE.test(reqPath) ||
    TAG_RE.test(reqPath) ||
    COMPARE_RE.test(reqPath) ||
    TOOLS_RE.test(reqPath);

  const isStaticPage = reqPath in STATIC_META;

  if (!matchesDynamicRoute && !isStaticPage) return next();

  const baseHtml = getBaseHtml();
  if (!baseHtml) return next();

  handleSsrMeta(req, res, next, baseHtml).catch(next);
}
