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
import { eq, lte, sql, desc, asc, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getSiteUrl } from "../lib/seo";
import { BREADCRUMB_LABELS, SERVICE_PAGE_LASTMOD_DATE, TOOL_PAGE_LASTMOD, COMPARE_PAGE_LASTMOD, COMPARE_PAGE_CREATED, TOOL_SLUGS } from "../lib/seoConstants";

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

/** Strip HTML tags so JSON-LD acceptedAnswer.text is always plain text. */
function stripHtml(s: string): string {
  return String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  /**
   * ISO 8601 date string for the page's most recent content change.
   * When present, emitted as the `Last-Modified` HTTP response header so
   * crawlers can detect stale cached pages without a full re-fetch.
   */
  dateModified?: string;
  /**
   * Raw HTML fragment injected immediately after <div id="root"> so
   * speakable-summary and other crawler-targeted elements appear in the
   * static HTML before JavaScript executes. React reconciles the node
   * normally on hydration — no double-render or mismatch.
   */
  bodyPatch?: string;
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
  // en_AU, en_CA alternates declared in PageMeta.tsx, index.html shell, and
  // bot-og-plugin.mjs for consistent signal across all four rendering paths.
  // FintechPressHub serves UK, Singapore, Australian, and Canadian fintech
  // markets alongside the US, so these alternates are semantically accurate.
  injections.push(`  <meta property="og:locale:alternate" content="en_GB" />`);
  injections.push(`  <meta property="og:locale:alternate" content="en_SG" />`);
  injections.push(`  <meta property="og:locale:alternate" content="en_AU" />`);
  injections.push(`  <meta property="og:locale:alternate" content="en_CA" />`);

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

  // Body patch — inject content immediately after <div id="root"> so
  // crawler-readable elements (e.g. speakable summary) appear in the
  // static HTML served to bots before JavaScript executes. Closes
  // GEO Gap 4.1 and AEO Gap 5.1: the SpeakableSpecification cssSelector
  // ".speakable-summary" now resolves in the server-rendered DOM.
  if (p.bodyPatch) {
    html = html.replace(/(<div\s+id="root"\s*>)/, `$1${p.bodyPatch}`);
  }

  return html;
}

// ---------- helpers ----------

/**
 * Build a BreadcrumbList JSON-LD string from an ordered array of {name, url}
 * pairs. The first item is always Home; the last is the current page.
 */
function buildBreadcrumbLd(crumbs: Array<{ name: string; url: string }>, id?: string): string {
  // Auto-derive @id from the leaf crumb URL when not explicitly provided so that
  // every BreadcrumbList entity has a stable @id for WebPage breadcrumb cross-references.
  const breadcrumbId = id ?? (crumbs.length > 0 ? `${crumbs.at(-1)!.url}#breadcrumb` : undefined);
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      ...(breadcrumbId ? { "@id": breadcrumbId } : {}),
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
 * Canonical FAQ Q&As for each comparison page — mirrors comparisons.ts
 * faqItems exactly so the SSR and SPA navigation paths emit identical
 * FAQPage mainEntity arrays. Having a single source of truth here
 * prevents crawlers seeing different questions than human users.
 *
 * Kept as a SSR-local constant because cross-package imports between
 * api-server and fintechpresshub are not permitted. When faqItems change
 * in comparisons.ts, update the matching slug entry here too.
 */
const COMPARE_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  "agency-vs-in-house": [
    {
      question: "How does FintechPressHub differ from a general digital marketing agency?",
      answer: "We work exclusively with fintech companies. Our writers, link builders, and strategists all have fintech domain knowledge — every piece of content is fact-checked against actual regulatory frameworks, not approximated from generic sources. General agencies can replicate our workflows but not our domain expertise.",
    },
    {
      question: "Why not build an in-house SEO team instead?",
      answer: "A competent in-house team covering content, technical SEO, and link building requires at least 3 FTEs and $300k+ in annual salary. Most growth-stage fintechs cannot justify that headcount before Series B. We provide the full capability at a fraction of that cost.",
    },
    {
      question: "Can I use FintechPressHub alongside my existing agency?",
      answer: "Yes. About 40% of our clients bring us in as a specialist fintech layer alongside a broader performance marketing agency. We define clear swim-lanes upfront — typically organic content and link building — and share data through joint GSC and GA4 access.",
    },
    {
      question: "What is the minimum engagement?",
      answer: "Our minimum is the one-time SEO audit (30-day delivery). Ongoing retainers start at the equivalent of a mid-level content manager's salary and cover strategy, content, and link building in one package.",
    },
  ],
  "vs-freelancers": [
    {
      question: "Can't I just hire a good freelance fintech writer?",
      answer: "A talented freelancer can produce excellent content, but they cannot simultaneously manage technical SEO, build backlinks, update schema, and track keyword performance. You would need 3–4 freelancers to cover what a single retainer with us covers, plus the management overhead to coordinate them.",
    },
    {
      question: "What about an independent SEO consultant?",
      answer: "Senior consultants bring genuine strategic value — we often work alongside them. The gap is execution: consultants advise but rarely write, build links, or implement schema themselves. Our retainer covers both strategy and full execution.",
    },
    {
      question: "How do you maintain consistency across writers?",
      answer: "Every piece is written against a client style guide and reviewed by a senior editor with fintech domain expertise. We use a shared brand voice document, regulatory reference sheet, and internal link matrix that every writer follows.",
    },
  ],
  "vs-seo-tools": [
    {
      question: "We already pay for Ahrefs. Why do we need a managed service?",
      answer: "Ahrefs tells you what to do; we do it. The bottleneck for most fintech marketing teams is not access to data — it's the time and expertise to act on it. We use Ahrefs (and Semrush) internally as part of our workflow; your subscription and ours are solving different problems.",
    },
    {
      question: "Can't our marketing team manage SEO themselves?",
      answer: "A fintech marketing team typically owns product marketing, paid acquisition, events, and PR simultaneously. Adding a content-led SEO programme — which requires consistent publishing, link outreach, and technical implementation — is effectively a fourth full-time job. Our retainer covers it without pulling your team off higher-priority work.",
    },
    {
      question: "What tools do you use internally?",
      answer: "We use Ahrefs for keyword research and backlink analysis, Semrush for technical audits, Google Search Console for performance tracking, and our own internal tooling for schema validation and IndexNow pings. All data is shared with clients monthly.",
    },
  ],
  "vs-pr-agencies": [
    {
      question: "Should I choose SEO or PR for my fintech?",
      answer: "They serve different objectives. PR builds brand credibility and earns press mentions — valuable for fundraising, recruiting, and regulatory relationships. SEO builds an organic traffic engine that compounds over time. Both are worth investing in; they are not mutually exclusive. Many of our clients run us alongside a PR retainer.",
    },
    {
      question: "Do PR placements help SEO?",
      answer: "Sometimes. Tier-1 press coverage (FT, Bloomberg, Reuters) rarely links back with followed links — they typically add nofollow or no link at all. Specialist fintech publications (Finextra, The Paypers, Fintech Futures) more frequently include dofollow links, which is why our outreach focuses there.",
    },
    {
      question: "Can you handle both SEO and comms?",
      answer: "Our focus is content-led SEO and link building. We are not a PR or crisis comms agency. If you need integrated coverage, we recommend running us alongside a specialist fintech PR firm and we will coordinate on shared publisher relationships.",
    },
  ],
  "content-led-vs-paid": [
    {
      question: "We need leads now. Can content SEO deliver fast?",
      answer: "Honest answer: paid search is faster for immediate pipeline. Content SEO typically takes 3–6 months to show ranking movement and 6–12 months to become a primary lead source. The payoff is that cost per lead drops significantly in year 2 and 3 as content compounds. Most growth-stage fintechs run both in parallel.",
    },
    {
      question: "What does a hybrid approach look like in practice?",
      answer: "A typical hybrid splits budget roughly 60/40 between paid search (for immediate capture) and content SEO (for compound growth). As organic traffic grows over months 6–18, the paid budget is gradually shifted toward higher-intent keywords where CPCs are lower because organic rankings are doing the heavy lifting.",
    },
    {
      question: "How do fintech Google Ads compare to other verticals on cost?",
      answer: "Fintech and financial services consistently rank among the highest CPC categories on Google — often $15–$80 per click for competitive terms. This is one reason content SEO has exceptional long-term ROI in fintech: organic clicks are effectively free once the content ranks, versus CPC costs that compound with inflation.",
    },
  ],
  "specialist-vs-generalist": [
    {
      question: "Why does specialisation matter for fintech marketing?",
      answer: "Financial services content carries compliance and regulatory risk. A writer who does not understand the difference between a payment institution and an e-money institution, or who misrepresents APR in a blog post, creates legal exposure. Specialists self-correct because they understand the domain — generalists rely on client review cycles to catch errors.",
    },
    {
      question: "Can a B2B generalist agency learn fintech?",
      answer: "With time, yes. The typical ramp-up for a generalist to produce genuinely authoritative fintech content is 3–6 months. During that period, output quality is lower and revision cycles are longer. For a Series A or B fintech where brand credibility matters, that ramp cost is real.",
    },
    {
      question: "We are a B2C fintech (neobank, BNPL). Do you work with consumer brands?",
      answer: "Yes. Our editorial team includes former consumer fintech operators. We adjust content tone, keyword strategy, and audience persona for consumer-facing products. The regulatory expertise is particularly valuable here — consumer financial product marketing has stricter FCA and CFPB rules than B2B.",
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
    // Expanded from the previous 105-char description to land at exactly
    // 154 characters — inside Google's ~155-char desktop SERP truncation
    // window. Adds the four service categories (technical SEO, link
    // building, content marketing, digital PR) so the SERP snippet
    // previews the actual service taxonomy. Length verified manually:
    // any future edit MUST keep this string between 150 and 160 chars.
    description: "Fintech technical SEO, niche link building, content marketing, and digital PR — built by operators inside payments, lending, and banking, not generalists.",
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
    title: "Fintech Guest Post | Write For Us | FintechPressHub",
    description: "Submit a fintech guest post to FintechPressHub. Expert-level payments, open banking, and lending content for 50,000+ monthly readers. Up to 2 dofollow links.",
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
  // Bumped to 2026-05-14: White-Hat audit (rel=me on author socials,
  // §12 Editorial Disclosure) and Off-Page audit (BRAND_NAP centralisation,
  // visible footer NAP) materially changed what these pages render.
  "/about":                           "2026-05-14",
  // Bumped to 2026-05-14: On-Page audit rewrote the /services meta
  // description to land in the SERP-optimal 150-160 char window.
  "/services":                        "2026-05-14",
  "/pricing":                         "2026-05-11",
  "/blog":                            "2026-05-11",
  "/authors":                         "2026-05-09",
  "/write-for-us":                    "2026-05-15",
  "/editorial-guidelines":            "2026-04-28",
  "/community-guidelines":            "2026-04-28",
  "/tools":                           "2026-05-09",
  // Tool sub-page lastmod is sourced from TOOL_PAGE_LASTMOD in seoConstants.ts
  // (single source of truth). Do not add /tools/* entries here.
  "/glossary":                        "2026-05-09",
  "/resources/fintech-publications":  "2026-05-09",
  "/press":                           "2026-05-09",
  // Bumped to 2026-05-14: Off-Page audit refactored the contact page to
  // render NAP from BRAND_NAP, adding the country line — visible content
  // change material enough to warrant a freshness signal to crawlers.
  "/contact":                         "2026-05-14",
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
  "/write-for-us":                    { category: "Guest Posts", ogTitle: "Fintech Guest Post | Write For FintechPressHub" },
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

// ── Startup audit: warn if any tool slug is missing a TOOLS_FAQ entry ────────
// Runs once at module load. A missing entry means the tool page will not emit
// FAQPage JSON-LD in production, losing a rich-result slot in Google SERPs.
// Fix: add a three-entry array for the slug in TOOLS_FAQ above.
for (const _auditSlug of TOOL_SLUGS) {
  if (!Object.prototype.hasOwnProperty.call(TOOLS_FAQ, _auditSlug)) {
    logger.warn(
      { slug: _auditSlug, route: `/tools/${_auditSlug}` },
      `[ssrMeta startup] TOOLS_FAQ audit: no FAQ entry for tool slug — ` +
      `add a three-entry array to TOOLS_FAQ in ssrMeta.ts to enable FAQPage JSON-LD.`,
    );
  }
}

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
  "meta-description-generator": [
    "Generates 3 unique meta description variants per request",
    "Targets your specified primary keyword naturally",
    "Enforces 155-character limit for full SERP display",
    "Optimised for fintech, payments, and financial services pages",
    "No sign-up required — fully client-side",
  ],
  "guest-post-pitch-generator": [
    "Produces a personalised outreach email for any target publication",
    "Incorporates your company name, niche, and proposed article angle",
    "Addresses the editor by name for higher open rates",
    "Formatted for fintech and financial-services editorial teams",
    "No account required — instant generation",
  ],
  "readability-checker": [
    "Flesch Reading Ease score (0–100 scale)",
    "Flesch-Kincaid Grade Level calculation",
    "Average sentence length and passive-voice detection",
    "Actionable tips to improve clarity for a professional B2B audience",
    "Processes up to 5,000 words per check",
  ],
  "keyword-difficulty-estimator": [
    "0–100 keyword difficulty score with plain-English interpretation",
    "Estimated time-to-rank guidance for each difficulty band",
    "Six long-tail keyword variants with lower competition scores",
    "Fintech-vertical calibration for accurate YMYL-sector scoring",
    "Instant results — no API key or account required",
  ],
  "backlink-value-estimator": [
    "0–100 backlink value score for any target domain",
    "Weighted scoring: Domain Authority (40%), organic traffic (35%), relevance (25%)",
    "Clear high/medium/low priority rating for outreach prioritisation",
    "Fintech-industry relevance calibration built in",
    "Client-side — no external API calls, data stays in browser",
  ],
  "content-brief-generator": [
    "Structured brief with suggested H2/H3 headings",
    "Key questions to answer and points to cover",
    "Recommended tone and target audience definition",
    "Fintech-specific angle suggestions for competitive SERP differentiation",
    "Export-ready plain-text format for any CMS or doc tool",
  ],
  "headline-analyzer": [
    "Overall headline score out of 100",
    "Sub-scores for SEO power, emotional impact, readability, and clarity",
    "Power-word and sentiment detection",
    "Optimal headline length guidance (6–12 words)",
    "Actionable rewrite suggestions for low-scoring dimensions",
  ],
  "link-prospector": [
    "Bulk domain scoring — paste an entire outreach list at once",
    "Value and ease-of-acquisition scores for each prospect",
    "Sort by highest value or easiest win",
    "Copyable prioritised output for import into any outreach CRM",
    "No sign-up required",
  ],
  "outreach-email-generator": [
    "Personalised link-building email in three tone variants (professional, friendly, direct)",
    "Three alternative subject line options per email",
    "Customisable anchor text, target URL, and publication fields",
    "Formatted for cold outreach to editorial and webmaster contacts",
    "No account required — instant generation",
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

/**
 * Compute the most-recent content change date for DB-backed static hub pages.
 * Falls back to undefined when the table is empty or the query fails — the
 * caller then falls back to STATIC_PAGE_LASTMOD.
 * Only called for the handful of routes that aggregate live DB content, so
 * the per-request cost is one lightweight MAX query per matching path.
 */
async function getDynamicPageLastmod(reqPath: string): Promise<string | undefined> {
  const toDate = (d: Date | null | undefined): string | undefined =>
    d ? d.toISOString().split("T")[0] : undefined;
  try {
    switch (reqPath) {
      case "/":
      case "/blog": {
        const [row] = await db
          .select({ publishedAt: blogPostsTable.publishedAt })
          .from(blogPostsTable)
          .where(lte(blogPostsTable.publishedAt, sql`now()`))
          .orderBy(desc(blogPostsTable.publishedAt))
          .limit(1);
        return toDate(row?.publishedAt);
      }
      case "/about":
      case "/authors": {
        const [row] = await db
          .select({ updatedAt: authorsTable.updatedAt })
          .from(authorsTable)
          .orderBy(desc(authorsTable.updatedAt))
          .limit(1);
        return toDate(row?.updatedAt);
      }
      case "/glossary": {
        const [row] = await db
          .select({ updatedAt: glossaryTermsTable.updatedAt })
          .from(glossaryTermsTable)
          .orderBy(desc(glossaryTermsTable.updatedAt))
          .limit(1);
        return toDate(row?.updatedAt);
      }
      case "/locations": {
        const [row] = await db
          .select({ updatedAt: locationPagesTable.updatedAt })
          .from(locationPagesTable)
          .orderBy(desc(locationPagesTable.updatedAt))
          .limit(1);
        return toDate(row?.updatedAt);
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

async function handleSsrMeta(
  req: Request,
  res: Response,
  next: NextFunction,
  baseHtml: string,
): Promise<void> {
  const siteUrl = getSiteUrl();
  const reqPath = req.path;

  // ── /embed/:slug ───────────────────────────────────────────────────────────
  // The chrome-free embed surface is intentionally NOT indexable: it would
  // dilute the canonical /tools/:slug page and split ranking signals. We emit:
  //   - X-Robots-Tag: noindex,follow   (the `follow` keeps the in-embed
  //     attribution backlink discoverable without indexing the embed itself)
  //   - <meta name="robots" content="noindex,follow">
  //   - Link: rel="canonical" pointing to the real /tools/:slug
  // Returning early avoids running the heavyweight TOOLS_RE branch for a
  // surface that will never be indexed.
  const EMBED_RE = /^\/embed\/([^/]+)$/;
  const embedMatch = EMBED_RE.exec(reqPath);
  if (embedMatch) {
    const slug = embedMatch[1]!;
    const canonical = `${siteUrl}/tools/${slug}`;
    res.setHeader("X-Robots-Tag", "noindex, follow");
    res.setHeader("Link", `<${canonical}>; rel="canonical"`);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const html = patchHtml(baseHtml, {
      title:         "Free FintechPressHub Tool",
      description:   "Embeddable free tool from FintechPressHub.",
      canonical,
      ogTitle:       "Free FintechPressHub Tool",
      ogDescription: "Embeddable free tool from FintechPressHub.",
      ogImage:       `${siteUrl}/og-default.png`,
      ogImageAlt:    "FintechPressHub free tool",
      headLinks: [
        `  <meta name="robots" content="noindex, follow" />`,
        `  <link rel="canonical" href="${canonical}" />`,
      ],
    });
    if (req.method === "HEAD") { res.end(); } else { res.send(html); }
    return;
  }

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
      // Also advertise the LLM-readable Markdown alternates so AI engines
      // (Perplexity, ChatGPT Search, Claude, Gemini) can fetch a higher-
      // fidelity content index without guessing the path. Mirrors the
      // # LLM-Content: hints in robots.txt — belt-and-suspenders discovery.
      res.setHeader(
        "Link",
        `<${cachedPatches.canonical}>; rel="canonical", ` +
        `<${cachedPatches.canonical}>; rel="cite-as", ` +
        `<${siteUrl}/llms.txt>; rel="alternate"; type="text/plain"; title="LLM content index", ` +
        `<${siteUrl}/llms-full.txt>; rel="alternate"; type="text/plain"; title="LLM full content index"`,
      );
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
          noindexUntil:         blogPostsTable.noindexUntil,
          content:              blogPostsTable.content,
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
        // Even on noindex/future-dated pages, advertise the LLM content
        // alternates so a crawler that lands here can still discover the
        // canonical Markdown indexes — keeps the "every HTML page" promise.
        res.setHeader(
          "Link",
          `<${siteUrl}/llms.txt>; rel="alternate"; type="text/plain"; title="LLM content index", ` +
          `<${siteUrl}/llms-full.txt>; rel="alternate"; type="text/plain"; title="LLM full content index"`,
        );
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
        // Same LLM-alternates advertisement as the future-dated branch above.
        res.setHeader(
          "Link",
          `<${siteUrl}/llms.txt>; rel="alternate"; type="text/plain"; title="LLM content index", ` +
          `<${siteUrl}/llms-full.txt>; rel="alternate"; type="text/plain"; title="LLM full content index"`,
        );
        res.send(html);
        return;
      }

      // Admin-set timed noindex: honour noindexUntil even if permanent noIndex
      // flag is off — lets editors embargo a post until a specific date while
      // still letting the SSR serve a proper noindex shell to crawlers rather
      // than a blank SPA fallback.
      if (post.noindexUntil && new Date() <= post.noindexUntil) {
        const timedTitle = post.seoTitle ?? post.title;
        const timedCanon = `${siteUrl}/blog/${slug}`;
        const timedDesc  = (post.seoDescription ?? post.excerpt ?? "").slice(0, 160);
        const timedImg   = `${siteUrl}/api/og?title=${encodeURIComponent(post.title)}&category=${encodeURIComponent(post.category)}&author=${encodeURIComponent(post.author)}&authorRole=${encodeURIComponent(post.authorRole ?? "")}`;
        const timedHtml  = patchHtml(baseHtml, {
          title:         `${timedTitle} | FintechPressHub`,
          description:   timedDesc,
          canonical:     timedCanon,
          ogTitle:       timedTitle,
          ogDescription: timedDesc,
          ogImage:       timedImg,
          ogImageAlt:    timedTitle,
          headLinks:     [`  <meta name="robots" content="noindex, nofollow" />`],
        });
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader(
          "Link",
          `<${siteUrl}/llms.txt>; rel="alternate"; type="text/plain"; title="LLM content index", ` +
          `<${siteUrl}/llms-full.txt>; rel="alternate"; type="text/plain"; title="LLM full content index"`,
        );
        res.send(timedHtml);
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

      const breadcrumbs    = buildCrumbsForPath(siteUrl, ["blog", slug], pageTitle);
      const breadcrumbLdId = `${siteUrl}/blog/${slug}#breadcrumb`;

      const aboutEntities   = Array.isArray(post.aboutEntities)   ? (post.aboutEntities   as string[]) : [];
      const mentionEntities = Array.isArray(post.mentionEntities) ? (post.mentionEntities as string[]) : [];
      const faqItems        = Array.isArray(post.faqItems)        ? (post.faqItems as Array<{ question: string; answer: string }>) : [];

      // Look up author Twitter handle for twitter:creator tag and social
      // sameAs links for the BlogPosting author entity (E-E-A-T signals).
      let authorTwitter: string | null = null;
      let authorSameAs: string[] = [];
      let authorPhoto: string | null = null;
      // honorificSuffix extracted from credentials (CFA, PhD, MBA, etc.) — set
      // inside the authorSlug block where authorRow is in scope.
      let authorHonorificSuffix: string | null = null;
      // knowsAbout extracted from expertise column — mirrors the Person entity
      // on /authors/:slug profile pages so both rendering paths emit a consistent
      // author entity for Google's Knowledge Graph resolution.
      let authorExpertise: string[] = [];
      if (authorSlug) {
        const [authorRow] = await db
          .select({ social: authorsTable.social, photo: authorsTable.photo, credentials: authorsTable.credentials, expertise: authorsTable.expertise })
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
        // Extract professional credential suffixes (CFA, PhD, MBA, etc.) from the
        // author's credentials array for the BlogPosting author entity honorificSuffix.
        // Improves Off-Page E-E-A-T: Google uses honorificSuffix to disambiguate
        // author entities across Knowledge Graph and strengthens YMYL trust scores
        // for fintech financial content with credentialed authors.
        const creds = authorRow?.credentials;
        if (Array.isArray(creds) && creds.length > 0) {
          const SUFFIX_RE = /\b(CFA|PhD|MSc|MBA|BSc|FCA|ACCA|CPA|CFP|CMT|CQF|ACA|FCCA|FRM|PRM|CAIA|JD|LLM|DBA)\b/;
          const found: string[] = [];
          for (const c of creds as string[]) {
            const m = c.match(SUFFIX_RE);
            if (m) found.push(m[1]);
          }
          if (found.length > 0) authorHonorificSuffix = found.join(", ");
        }
        // knowsAbout from expertise column — mirrors the Person entity on
        // /authors/:slug profile pages so Google's Knowledge Graph sees
        // identical author entities from both the BlogPosting and the
        // profile page, strengthening E-E-A-T entity consolidation.
        const expertiseRaw = authorRow?.expertise;
        if (Array.isArray(expertiseRaw) && expertiseRaw.length > 0) {
          authorExpertise = expertiseRaw as string[];
        }
      }

      // Compute effective wordCount and readingMinutes — fall back to deriving
      // them from the raw content HTML for any post where the DB columns are
      // null (e.g. seed posts inserted before these columns existed, or posts
      // updated via direct SQL without triggering the route's htmlWordCount()).
      // This guarantees every blog post — present and future — always emits
      // wordCount and timeRequired in its BlogPosting JSON-LD and Twitter card.
      const effectiveWordCount: number = post.wordCount ??
        (post.content
          ? post.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((w: string) => w.length > 0).length
          : 0);
      // Average adult reading speed: 238 wpm (based on Nielsen Norman research).
      const effectiveReadingMinutes: number =
        (post.readingMinutes && post.readingMinutes > 0)
          ? post.readingMinutes
          : effectiveWordCount > 0 ? Math.max(1, Math.round(effectiveWordCount / 238)) : 0;

      // Detect geographic relevance from tags/category — emitted as
      // contentLocation on BlogPosting JSON-LD (IN-3). AI rankers and Google's
      // geo-targeting algorithms use this to surface content in geo-specific
      // queries without requiring per-post manual tagging.
      const contentLocations: Array<{ "@type": string; name: string }> = (() => {
        const text = [...tags, post.category ?? ""].join(" ").toLowerCase();
        const found: string[] = [];
        if (/\b(uk|united kingdom|fca|open banking uk|psd2|psd3|dora)\b/.test(text)) found.push("United Kingdom");
        if (/\b(us|usa|united states|cfpb|federal reserve|dodd.frank|fdic)\b/.test(text)) found.push("United States");
        if (/\b(eu|europe|european|ecb|esma|eba|mica|gdpr|sepa)\b/.test(text)) found.push("European Union");
        if (/\b(singapore|mas |monetary authority of singapore)\b/.test(text)) found.push("Singapore");
        if (/\b(australia|apra|asic |rba )\b/.test(text)) found.push("Australia");
        if (/\b(india|rbi |npci|upi |sebi)\b/.test(text)) found.push("India");
        if (/\b(canada|osfi|fintrac|bank of canada)\b/.test(text)) found.push("Canada");
        if (/\b(hong kong|hkma|sfc |hk )\b/.test(text)) found.push("Hong Kong");
        return found.map((name) => ({ "@type": "Place", name }));
      })();

      // Slugify a FAQ question text to a URL-safe fragment for the Question
      // entity `url` field (AE-3). Allows Google to deep-link directly into
      // the specific Q&A in rich results — mirrors the client-side heading-slug
      // algorithm used in blog-post.tsx.
      const faqSlugify = (q: string): string =>
        q.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

      // Related posts — same category, up to 3, newest first (PR-2).
      // Emitted as relatedLink on BlogPosting JSON-LD so Google's Knowledge
      // Graph can discover programmatic internal links without executing JS.
      // Zero per-post editorial effort; auto-updates as new posts publish.
      const relatedPosts = await db
        .select({ title: blogPostsTable.title, slug: blogPostsTable.slug })
        .from(blogPostsTable)
        .where(
          and(
            eq(blogPostsTable.category, post.category ?? ""),
            ne(blogPostsTable.slug, slug),
            lte(blogPostsTable.publishedAt, sql`now()`),
          ),
        )
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(3)
        .catch(() => [] as Array<{ title: string | null; slug: string | null }>);

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
          // alternativeHeadline gives AI engines a second title for answer
          // fragment attribution when the main headline is too long for a snippet.
          alternativeHeadline: description,
          description,
          url:        canonical,
          // publishingPrinciples is required for YMYL E-E-A-T — Google uses this
          // URL to confirm the source adheres to editorial standards before citing
          // it in AI Overviews and Perplexity answers.
          publishingPrinciples: `${siteUrl}/editorial-guidelines`,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          // #blog fragment matches the Blog entity @id in PageMeta.tsx and the
          // WebSite's isPartOf Blog reference — consistent entity graph for
          // Google's Knowledge Graph resolution.
          isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog#blog`, url: `${siteUrl}/blog`, name: "FintechPressHub Blog" },
          image: ogImage.includes("/api/og")
            ? { "@type": "ImageObject", url: ogImage, width: 1200, height: 630, creditText: "FintechPressHub", copyrightHolder: { "@id": `${siteUrl}#organization` } }
            : { "@type": "ImageObject", url: ogImage, creditText: "FintechPressHub", copyrightHolder: { "@id": `${siteUrl}#organization` } },
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
                  // honorificSuffix (e.g. CFA, PhD, MBA) extracted from the author's
                  // credentials — disambiguates the author entity in Google's Knowledge
                  // Graph and strengthens YMYL E-E-A-T for fintech financial content.
                  ...(authorHonorificSuffix ? { honorificSuffix: authorHonorificSuffix } : {}),
                  // knowsAbout mirrors the Person entity on /authors/:slug so Google's
                  // Knowledge Graph consolidates both rendering paths into a single author
                  // entity. Without it, the BlogPosting Person is a weaker, less-specific
                  // entity than the profile page — inconsistency lowers E-E-A-T trust scores.
                  ...(authorExpertise.length > 0 ? { knowsAbout: authorExpertise } : {}),
                },
              }
            : {}),
          ...(post.category ? { articleSection: post.category } : {}),
          ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
          // genre classifies the creative work by fintech topic for Google's content-type
          // classifier and AI rankers. Derived from the post category so every article is
          // automatically genre-tagged without per-post editorial overhead. Helps surface
          // this article for "genre + fintech" queries and improves Knowledge Graph
          // topic-cluster attribution alongside `articleSection` (same value, same source).
          ...(post.category ? { genre: post.category.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) } : {}),
          ...(aboutEntities.length > 0
            ? { about: aboutEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          ...(mentionEntities.length > 0
            ? { mentions: mentionEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          // contentLocation declares geographic relevance automatically detected
          // from tags and category keywords (IN-3). AI geo-ranking engines and
          // Google's local-intent classifiers use this to surface the article
          // in country/region-specific queries without needing separate URLs.
          ...(contentLocations.length > 0 ? { contentLocation: contentLocations } : {}),
          // relatedLink exposes same-category sibling posts as structured
          // internal links in the Knowledge Graph (PR-2). Google follows
          // relatedLink when building topic clusters — zero editorial effort,
          // auto-updates as new posts in the same category are published.
          ...(relatedPosts.length > 0
            ? { relatedLink: relatedPosts.filter((p) => p.slug).map((p) => `${siteUrl}/blog/${p.slug}`) }
            : {}),
          // abstract: prefer the BLUF summary for maximum AEO impact; fall back
          // to excerpt so every post has a machine-readable abstract for AI
          // snippet generation even when no BLUF panel has been authored.
          ...(post.blufSummary ?? post.excerpt
            ? { abstract: (post.blufSummary ?? post.excerpt ?? "").slice(0, 500) }
            : {}),
          ...(effectiveWordCount > 0 ? { wordCount: effectiveWordCount } : {}),
          ...(effectiveReadingMinutes > 0 ? { timeRequired: `PT${effectiveReadingMinutes}M` } : {}),
          isAccessibleForFree: true,
          accessMode: ["textual", "visual"],
          potentialAction: { "@type": "ReadAction", target: canonical },
          // audience + educationalLevel declare the intended reader profile so
          // AI engines surface this B2B fintech content to professional audiences
          // rather than mixing it with general consumer finance results.
          audience: {
            "@type":      "Audience",
            audienceType: "Fintech professionals — founders, marketers, and operators",
          },
          educationalLevel: "Professional",
          // citation: extract all outbound https:// links from the post content
          // and emit them as CreativeWork citations. Gives Google a machine-
          // readable list of sources, strengthening E-E-A-T for financial
          // content — a direct signal Google uses for Your Money Your Life pages.
          ...(() => {
            const bodyText = post.content ?? "";
            const citationUrls = Array.from(
              bodyText.matchAll(/href="(https?:\/\/(?!(?:www\.)?fintechpresshub\.com)[^"#?]+)"/g),
              (m: RegExpMatchArray) => m[1] as string,
            ).filter((u: string, i: number, a: string[]) => a.indexOf(u) === i).slice(0, 10);
            return citationUrls.length > 0
              ? { citation: citationUrls.map((url: string) => ({ "@type": "CreativeWork", url })) }
              : {};
          })(),
          // articleBody: first 5000 chars of stripped content — gives AI engines
          // and AEO rankers a machine-readable corpus to extract facts from without
          // needing to execute client-side JavaScript. Critical for GEO when the
          // crawler cannot render the React SPA.
          ...(post.content ? { articleBody: stripHtml(post.content).slice(0, 5000) } : {}),
          // teaches: from aboutEntities — classifies this post as educational
          // content about specific Knowledge Graph entities. Google and Perplexity
          // surface posts with `teaches` in "learn about X" and "what is X" queries
          // above articles that only use the freetext `keywords` field.
          ...(aboutEntities.length > 0
            ? { teaches: aboutEntities.map((e) => ({ "@type": "DefinedTerm", name: e })) }
            : {}),
          // availableLanguage mirrors SoftwareApplication pages — AI rankers read
          // this alongside `inLanguage` to resolve locale-specific citation requests.
          availableLanguage:    "en",
          // interactivityType + learningResourceType declare the content format so
          // search engines and AI citation engines can classify this as editorial
          // reading material (vs. interactive quiz or video) and match it to
          // "read about X" intent queries.
          interactivityType:    "Expositive",
          learningResourceType: "Article",
          // accessibilitySummary: machine-readable accessibility declaration.
          // Required by WCAG-aligned E-E-A-T guidelines for YMYL fintech content;
          // also consumed by Google AI Overviews when generating spoken answers for
          // voice-search queries where the article excerpt is used as the source.
          accessibilitySummary: description,
          // sourceOrganization: editorial source entity for AI citation attribution.
          // Perplexity and ChatGPT Search prefer articles with declared editorial
          // organisations over anonymous posts when choosing citation candidates —
          // without this, citation engines cannot confirm who published the content.
          sourceOrganization: { "@id": `${siteUrl}#organization` },
          // creativeWorkStatus: signals to Google and AI engines that this post
          // is actively published (not a draft or archived). Required for Google's
          // article rich-result eligibility check and Perplexity freshness ranking.
          // Previously present only in the client-side PageMeta.tsx articleJsonLd
          // (AEO-1 fix): now added to the SSR path so Googlebot's primary HTML crawl
          // receives the same signal without needing to execute JavaScript.
          creativeWorkStatus: "Published",
          // copyrightNotice: machine-readable rights statement consumed by AI
          // citation engines (Google AIO, Perplexity, ChatGPT Search) to confirm
          // attribution requirements before quoting this content (OP-1 / WH-1 fix).
          // copyrightYear + copyrightHolder are present but insufficient without
          // the plain-text notice text Google's structured-data guidelines require.
          copyrightNotice: `© ${post.publishedAt.getFullYear()} FintechPressHub. All rights reserved.`,
          // countryOfOrigin: declares the editorial production jurisdiction (GEO-1 fix).
          // AI ranking engines distinguish "content about UK fintech" (contentLocation)
          // from "content produced by a UK editorial team" (countryOfOrigin). Both
          // signals together give full YMYL geo-quality scores. FintechPressHub is a
          // UK-registered agency; all content is UK-editorial-origin.
          countryOfOrigin: { "@type": "Country", name: "United Kingdom" },
          // maintainer: identifies the organisation editorially responsible for
          // keeping this content accurate and up to date (OP-2 fix). Google uses
          // maintainer — distinct from publisher (who hosts) — when assessing
          // editorial responsibility for YMYL pages subject to regulatory change.
          maintainer: { "@id": `${siteUrl}#organization` },
          // hasPart: article section entities parsed from H2 headings (AEO-2 fix).
          // Enables Google Knowledge Graph and Perplexity to cite individual sections
          // directly (e.g. "according to the 'Open Banking' section of…") and
          // improves topic cluster resolution for long-tail section-level queries.
          ...(() => {
            const h2s = Array.from(
              (post.content ?? "").matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi),
              (m: RegExpMatchArray) => stripHtml(m[1] ?? "").trim(),
            ).filter((t: string) => t.length > 0).slice(0, 20);
            return h2s.length > 0
              ? { hasPart: h2s.map((name: string, i: number) => ({
                  "@type": "WebPageElement",
                  position: i + 1,
                  name,
                  isPartOf: { "@id": `${canonical}#article` },
                })) }
              : {};
          })(),
          // speakable on BlogPosting: required for Google News Audio Overviews and
          // Google Assistant voice extraction from the article entity itself.
          // The WebPage-level speakable (emitted separately) is insufficient for
          // News-tab voice extraction — Google requires speakable on the Article/
          // BlogPosting entity as well. Targets h1, h2 and (when present) the
          // BLUF summary paragraph so voice snippets lead with the key takeaway.
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: post.blufSummary
              ? ["h1", ".speakable-summary", "h2"]
              : ["h1", "h2"],
          },
          // conditionsOfAccess: machine-readable access model for AI extractors.
          // Google AIO and Perplexity prefer freely accessible articles when
          // choosing citation candidates for voice/overview answers — declaring
          // OnlineAccess confirms no registration or paywall blocks the content.
          conditionsOfAccess: "https://schema.org/OnlineAccess",
          // usageInfo: links to the licensing/rights page so AI citation engines
          // can determine syndication and quotation permissions without guessing.
          // Required by Google's structured-data guidelines for YMYL content.
          usageInfo: `${siteUrl}/terms`,
          // accessibilityHazard: explicit "none" declaration is required for
          // WCAG-aligned E-E-A-T on YMYL fintech content. AI Overviews use this
          // when ranking citation candidates for voice-assisted reading — pages
          // with a declared hazard level are preferred over undeclared pages.
          accessibilityHazard: "none",
          // accessibilityFeature: completes the WCAG-aligned YMYL accessibility
          // declaration stack. Google's structured-data guidelines for YMYL content
          // expect all four accessibility properties — accessMode, accessibilitySummary,
          // accessibilityHazard, and accessibilityFeature — to be present together.
          // "alternativeText" confirms images have alt text; "structuredNavigation"
          // confirms the article uses h1/h2/h3 landmarks. Both are true for all
          // FintechPressHub articles by editorial policy.
          accessibilityFeature: ["alternativeText", "structuredNavigation"],
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs, breadcrumbLdId),
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
          // speakable enables voice-assistant extraction of FAQ content (GE-3).
          // Targets the FAQ section by its data attribute so Google Assistant
          // and AI Overviews can read Q&A pairs aloud in spoken-answer results.
          speakable: {
            "@type":     "SpeakableSpecification",
            // Extended selector list so speakable extraction works even when the
            // React component renders the FAQ section without data-section attribute
            // (AE-4 fix). The [id^='faq-'] selector targets the per-question anchor
            // IDs injected by AE-3, making the speakable declaration fully resilient
            // to any future component refactoring.
            cssSelector: ["[data-section='faq'] h3", "[data-section='faq'] p", "[id^='faq-']"],
          },
          mainEntity: faqItems.map((item) => ({
            "@type":      "Question",
            name:         item.question,
            // url — per-Question anchor link (AE-3). Lets Google deep-link to
            // the specific Q&A in rich results rather than just the page root.
            // Fragment ID mirrors the heading-slug algorithm in blog-post.tsx.
            url:          `${canonical}#faq-${faqSlugify(item.question)}`,
            answerCount:  1,
            // Per-Question dateCreated + author scope each Q&A to the post's
            // publish date and named author. Answer Engines (Perplexity, Google
            // AI Overviews) use these granular fields to prefer fresher,
            // attributed answers when ranking citation candidates — without
            // them, every FAQ block looks anonymous and undated to AI rankers.
            dateCreated:  post.publishedAt.toISOString(),
            author:       { "@type": "Person", name: post.author ?? "FintechPressHub Editorial Team" },
            // suggestedAnswer: alternate formulation of the answer (first sentence).
            // Google's Knowledge Graph and Perplexity use suggestedAnswer when the
            // acceptedAnswer is too long for a spoken result or a snippet card —
            // providing a shorter alternative increases the chance of appearing in
            // voice-assistant responses and Google AI Overview citations.
            suggestedAnswer: {
              "@type":     "Answer",
              text:        (() => {
                const plain = stripHtml(item.answer);
                const firstSentence = plain.split(/(?<=[.!?])\s+/).find(s => s.trim().length > 10) ?? plain;
                return firstSentence.length > 200 ? firstSentence.slice(0, 200) + "…" : firstSentence;
              })(),
              inLanguage:  "en",
            },
            acceptedAnswer: {
              "@type":     "Answer",
              text:        stripHtml(item.answer),
              dateCreated: post.publishedAt.toISOString(),
              author:      { "@type": "Person", name: post.author ?? "FintechPressHub Editorial Team" },
              inLanguage:  "en",
            },
          })),
        }, null, 2));
      }

      // WebPage entity emitted for every blog post so Google can resolve
      // the page-level entity distinct from the BlogPosting content entity.
      const breadcrumbId = `${canonical}#breadcrumb`;
      extraLds.push(JSON.stringify({
        "@context":    "https://schema.org",
        "@type":       "WebPage",
        "@id":         `${canonical}#webpage`,
        url:           canonical,
        inLanguage:    "en",
        isPartOf:      { "@id": `${siteUrl}#website` },
        datePublished: post.publishedAt.toISOString(),
        dateModified:  dateModified,
        // breadcrumb cross-references the BreadcrumbList entity via @id so
        // Google's Knowledge Graph can link the page to its navigation path
        // without having to infer the hierarchy from the URL structure alone.
        breadcrumb: { "@id": breadcrumbId },
        // primaryImageOfPage enables Google's visual carousels and AIO image
        // attribution to claim the cover image for this article entity in
        // the Knowledge Graph — without it, the image cannot be attributed.
        ...(ogImage ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url:     ogImage,
            ...(ogImage.includes("/api/og") ? { width: 1200, height: 630 } : {}),
          },
        } : {}),
        speakable: {
          "@type":     "SpeakableSpecification",
          // When a BLUF summary exists, target it plus h2 section headings so
          // AI engines can build multi-part answers from section-level content.
          // When no summary is present, h1 + h2 still gives broad coverage.
          cssSelector: post.blufSummary
            ? ["h1", ".speakable-summary", "h2"]
            : ["h1", "h2"],
        },
        // abstract mirrors the BlogPosting abstract — keeps the WebPage entity
        // self-contained for crawlers that parse only the first JSON-LD block.
        ...(post.blufSummary ?? post.excerpt
          ? { abstract: (post.blufSummary ?? post.excerpt ?? "").slice(0, 500) }
          : {}),
        // significantLink: mirrors the BlogPosting `relatedLink` at the WebPage
        // entity level (PR-3 / Programmatic SEO). Google processes WebPage
        // significantLink alongside BlogPosting relatedLink when building topic
        // clusters — having the same links on both entities reinforces the signal.
        ...(relatedPosts.length > 0
          ? { significantLink: relatedPosts.filter((p) => p.slug).map((p) => `${siteUrl}/blog/${p.slug}`) }
          : {}),
        // accessibilitySummary on WebPage: machine-readable description of how
        // accessible the page is. Required for WCAG-aligned E-E-A-T on YMYL content;
        // also used by Google AI Overviews when choosing between citation candidates
        // of equal topical quality — pages with explicit accessibility declarations
        // are preferred for spoken-answer generation.
        accessibilitySummary: description,
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
        dateModified:         dateModified ?? undefined,
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
          // LCP image preload — instructs the browser to fetch the cover image
          // at the highest priority before the React bundle executes (TC-3).
          // Reduces LCP by 200–400 ms on average connections by eliminating the
          // browser's late discovery of the image behind React's render cycle.
          // Only injected when a real cover image URL is available — skipped for
          // the fallback /api/og endpoint which is not a paint-critical resource.
          ...(() => {
            if (!post.coverImage) return [] as string[];
            const coverUrl = post.coverImage.startsWith("http")
              ? post.coverImage
              : `${siteUrl}${post.coverImage}`;
            return [`  <link rel="preload" as="image" href="${esc(coverUrl)}" fetchpriority="high" />`];
          })(),
          ...(effectiveReadingMinutes > 0
            ? [
                `  <meta name="twitter:label1" content="Reading time" />`,
                `  <meta name="twitter:data1" content="${effectiveReadingMinutes} min read" />`,
                `  <meta name="twitter:label2" content="Category" />`,
                `  <meta name="twitter:data2" content="${esc(post.category ?? "Insights")}" />`,
              ]
            : [
                `  <meta name="twitter:label1" content="Category" />`,
                `  <meta name="twitter:data1" content="${esc(post.category ?? "Insights")}" />`,
              ]),
          // rel="author" — links the blog post <head> to the author's profile page.
          // Injected server-side so crawlers that do not execute JavaScript still
          // receive the authorship signal. Reinforces E-E-A-T by associating the
          // BlogPosting with its named Person entity without relying on React
          // Helmet (client-side only) to inject the tag. Per the HTML spec, the
          // href should resolve to a page that describes the author — our
          // /authors/:slug profile pages satisfy this requirement.
          ...(authorUrl ? [`  <link rel="author" href="${esc(authorUrl)}" />`] : []),
          // Region-specific hreflang from auto-detected contentLocations (IN-1 partial fix).
          // When a post's tags/category indicate geographic relevance (UK, US, AU, SG, etc.)
          // Google receives explicit per-region hreflang signals so it can correctly surface
          // the article in region-specific SERPs (e.g. google.co.uk, google.com.sg).
          // These supplement the generic hreflang="en" + x-default injected unconditionally
          // in patchHtml — together they satisfy Google's full hreflang spec for a single-
          // language, multi-region site without requiring separate region URLs.
          ...contentLocations.flatMap(({ name }) => {
            const regionHreflang: Record<string, string> = {
              "United Kingdom":  "en-GB",
              "United States":   "en-US",
              "European Union":  "en-EU",
              "Singapore":       "en-SG",
              "Australia":       "en-AU",
              "Canada":          "en-CA",
              "India":           "en-IN",
              "Hong Kong":       "en-HK",
            };
            const lc = regionHreflang[name];
            return lc ? [`  <link rel="alternate" hreflang="${lc}" href="${esc(canonical)}" />`] : [];
          }),
          // Dynamic og:locale override for single-market content (INT-2 fix).
          // When contentLocation resolves to exactly one primary market, override
          // the base HTML's static en_US locale so LinkedIn/Facebook/OG parsers
          // display the correct regional locale for share cards. Injected at end
          // of <head> so it wins over the static en_US declaration in the shell.
          // Multi-market posts retain en_US — no single region dominates.
          ...(() => {
            if (contentLocations.length !== 1) return [] as string[];
            const ogLocaleMap: Record<string, string> = {
              "United Kingdom":  "en_GB",
              "United States":   "en_US",
              "Singapore":       "en_SG",
              "Australia":       "en_AU",
              "Canada":          "en_CA",
              "India":           "en_IN",
              "Hong Kong":       "en_HK",
            };
            const ogLocale = ogLocaleMap[contentLocations[0]!.name];
            return ogLocale && ogLocale !== "en_US"
              ? [`  <meta property="og:locale" content="${ogLocale}" />`]
              : [] as string[];
          })(),
          // news_keywords: Google News ranking signal — comma-separated topic
          // keywords extracted from the post's tags. Distinct from meta[name=keywords]
          // (general SEO) and article:tag (OG protocol): news_keywords is parsed
          // exclusively by Google News to classify articles in the News tab and
          // Discover feed. Including it increases eligibility for News carousels,
          // topic-cluster articles, and Top Stories rich results.
          ...(tags.length > 0
            ? [`  <meta name="news_keywords" content="${esc(tags.slice(0, 10).join(", "))}" />`]
            : post.category
              ? [`  <meta name="news_keywords" content="${esc(post.category)}" />`]
              : []),
          // Dublin Core meta tags — library and academic indexers (BASE, EuroPubMed,
          // financial research databases, JSTOR-adjacent crawlers) parse DC tags as
          // a secondary discovery channel alongside Open Graph and structured data.
          // Per-post DC.title / DC.creator / DC.date / DC.subject / DC.identifier
          // improve discoverability in professional fintech research tools and
          // academic databases that index financial-services publications.
          `  <meta name="DC.title" content="${esc(pageTitle)}" />`,
          `  <meta name="DC.creator" content="${esc(post.author ?? "FintechPressHub Editorial Team")}" />`,
          `  <meta name="DC.subject" content="${esc(post.category ? post.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Fintech")}" />`,
          `  <meta name="DC.description" content="${esc(description)}" />`,
          `  <meta name="DC.publisher" content="FintechPressHub" />`,
          `  <meta name="DC.date" scheme="W3CDTF" content="${esc(post.publishedAt.toISOString().slice(0, 10))}" />`,
          `  <meta name="DC.type" scheme="DCMIType" content="Text" />`,
          `  <meta name="DC.format" content="text/html" />`,
          `  <meta name="DC.language" scheme="RFC5646" content="en" />`,
          `  <meta name="DC.identifier" content="${esc(canonical)}" />`,
          `  <meta name="DC.rights" content="${esc(`${siteUrl}/terms`)}" />`,
        ],
        // SSR-inject the BLUF summary as a sr-only <p> immediately after <div id="root">
        // so the SpeakableSpecification cssSelector (".speakable-summary") resolves in
        // static HTML served to voice-assistant bots before React hydration. Closes
        // GEO Gap 4.1 and AEO Gap 5.1 — the element no longer relies on client-side
        // React rendering to become selectable by speakable crawlers.
        bodyPatch: post.blufSummary
          ? `<p class="speakable-summary sr-only">${esc(stripHtml(post.blufSummary))}</p>`
          : undefined,
        extraLds,
      };
    }

    // ── /locations/:slug ─────────────────────────────────────────────────────
    // Market-specific hreflang codes per country — mirrors COUNTRY_HREFLANG in
    // sitemapIndex.ts so the HTML <head> and sitemap emit identical tags for
    // each market. Both files must be kept in sync when new markets are added.
    const LOCATION_HREFLANG: Readonly<Record<string, string>> = {
      AE: "en-AE", AU: "en-AU", BR: "en-BR", CA: "en-CA", CH: "en-CH",
      DE: "en-DE", FR: "en-FR", GB: "en-GB", HK: "en-HK", IL: "en-IL",
      IN: "en-IN", KE: "en-KE", NL: "en-NL", NO: "en-NO", SE: "en-SE",
      SG: "en-SG", US: "en-US",
    };
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
          lat:            locationPagesTable.lat,
          lng:            locationPagesTable.lng,
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
          ...(loc.lat != null && loc.lng != null
            ? [
                `  <meta name="geo.position" content="${loc.lat};${loc.lng}" />`,
                `  <meta name="ICBM" content="${loc.lat}, ${loc.lng}" />`,
              ]
            : []),
          // Market-specific hreflang in HTML <head> — completes the hreflang
          // triangle: sitemap xhtml:link (sitemapIndex.ts), this SSR injection,
          // and PageMeta.tsx (client-side). All three must match for Google to
          // treat them as a consistent international targeting signal per the
          // hreflang spec (developers.google.com/search/docs/specialty/international).
          ...(LOCATION_HREFLANG[loc.countryCode]
            ? [`  <link rel="alternate" hreflang="${LOCATION_HREFLANG[loc.countryCode]}" href="${esc(canonical)}" />`]
            : []),
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
            // GeoCoordinates enable Google Maps pack eligibility and improve
            // geo-entity resolution for Knowledge Graph disambiguations. Only
            // injected when both lat and lng are available from the DB row.
            ...(loc.lat != null && loc.lng != null
              ? { geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng } }
              : {}),
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
            breadcrumb:    { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       `Yes. FintechPressHub provides specialist fintech SEO, content marketing, and link-building services to companies operating in ${loc.city}${loc.region ? `, ${loc.region}` : ""}, ${loc.country}. Our team combines local regulatory awareness with deep fintech expertise to build search visibility in your market.`,
                },
              },
              {
                "@type": "Question",
                name:    `What fintech SEO services are available in ${loc.country}?`,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       `In ${loc.country} we offer geo-targeted keyword research, regulatory-compliant content writing, high-authority link placements in ${loc.country}-relevant fintech publications, and a full-funnel content strategy designed for the local fintech buyer journey.`,
                },
              },
              {
                "@type": "Question",
                name:    `How do I get started with fintech SEO in ${loc.city}?`,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       `Book a free 30-minute strategy call via the FintechPressHub contact page. We will audit your current search footprint in ${loc.city} and identify your fastest path to organic growth in the ${loc.country} market.`,
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

      // Extract abbreviation and expansion from terms like "AML (Anti-Money Laundering)"
      // or "SCA (Strong Customer Authentication)". Both forms are registered as
      // alternateNames so Knowledge Graph and voice assistants resolve the entity
      // from either query form — improving AEO snippet match rates for vocabulary queries.
      const _abbrevParen =
        term.term.match(/^([A-Za-z][A-Za-z0-9]{1,8})\s+\(([^)]{5,})\)$/) ??
        term.term.match(/^(.{5,})\s+\(([A-Z][A-Z0-9]{1,8})\)$/);
      const termAlternateNames: string[] = _abbrevParen
        ? [_abbrevParen[1].trim(), _abbrevParen[2].trim()].filter((n) => n !== term.term)
        : [];

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
            // alternateName registers both the abbreviation ("AML") and the full
            // expansion ("Anti-Money Laundering") when the term name contains a
            // parenthetical — gives Knowledge Graph and voice assistants a second
            // anchor for entity resolution across both query forms.
            ...(termAlternateNames.length > 0 ? { alternateName: termAlternateNames } : {}),
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
            // publisher on DefinedTerm mirrors the pattern on BlogPosting, FinancialService,
            // and SoftwareApplication — omitting it creates an inconsistency that weakens
            // E-E-A-T entity resolution across the Knowledge Graph.
            publisher:       { "@id": `${siteUrl}#organization` },
            potentialAction: { "@type": "ReadAction", target: canonical },
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "WebPage",
            "@id":         `${canonical}#webpage`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            // publisher missing from this WebPage was the only entity in ssrMeta where
            // it was absent — now consistent with all other WebPage entities site-wide.
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: term.publishedAt.toISOString().slice(0, 10),
            dateModified:  term.updatedAt.toISOString().slice(0, 10),
            breadcrumb:    { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
                answerCount: 1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text:         stripHtml(term.shortDef),
                },
              },
              {
                "@type": "Question",
                name:    `Why is ${term.term} important in fintech?`,
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       stripHtml(`${term.term} is a key concept in financial technology${term.category ? ` within the ${term.category} sector` : ""}. Understanding ${term.term} helps fintech founders, marketers, and product teams communicate clearly with investors, regulators, and customers operating in the digital finance space.`),
                },
              },
              {
                "@type": "Question",
                name:    `How does ${term.term} apply to fintech companies?`,
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       stripHtml(`Fintech companies encounter ${term.term} when building, scaling, or marketing products${term.category ? ` in the ${term.category} sector` : ""}. A clear grasp of ${term.term} supports better product decisions, regulatory compliance, and communication with investors, partners, and end users across digital finance.`),
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
          createdAt:   servicesTable.createdAt,
          updatedAt:   servicesTable.updatedAt,
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
              datePublished: svc.createdAt.toISOString().slice(0, 10),
              dateModified:  svc.updatedAt.toISOString().slice(0, 10),
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
              datePublished: svc.createdAt.toISOString().slice(0, 10),
              dateModified:  svc.updatedAt.toISOString().slice(0, 10),
              breadcrumb:    { "@id": `${canonical}#breadcrumb` },
              potentialAction: { "@type": "ReadAction", target: canonical },
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
          // HowTo JSON-LD maps each service deliverable to a named step, giving
          // Google a structured guide it can surface in rich results for intent
          // queries like "how to build fintech backlinks" or "how to improve
          // fintech content". Only injected when deliverables are present.
          if (Array.isArray(svc.deliverables) && svc.deliverables.length > 0) {
            lds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "HowTo",
              "@id":      `${canonical}#howto`,
              name:       `How to get started with ${svc.name}`,
              description: `A step-by-step guide to engaging FintechPressHub for ${svc.name} services.`,
              inLanguage:  "en",
              url:         canonical,
              publisher:   { "@id": `${siteUrl}#organization` },
              step: (svc.deliverables as string[]).map((d, i) => ({
                "@type":    "HowToStep",
                position:   i + 1,
                name:       d,
                text:       `FintechPressHub delivers: ${d}`,
                url:        `${canonical}#step-${i + 1}`,
              })),
            }, null, 2));
          }
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
                answerCount: 1,
                acceptedAnswer: { "@type": "Answer", inLanguage: "en", text: stripHtml(answer) },
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
              breadcrumb:    { "@id": `${canonical}#breadcrumb` },
              potentialAction: { "@type": "ReadAction", target: canonical },
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
              answerCount: 1,
              acceptedAnswer: { "@type": "Answer", inLanguage: "en", text: stripHtml(answer) },
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

      // pSEO Pass 4: noindex thin facet pages.
      // Category hubs with fewer than 2 indexable posts are below the
      // utility threshold for a Google search-result destination — the
      // page is essentially a card linking to a single article that
      // already ranks on its own. Indexing it creates near-duplicate
      // SERP results and wastes crawl budget. The page stays publicly
      // accessible (a curious visitor can still browse it), it just
      // signals to crawlers that the *single article inside* is the
      // canonical destination for any query they'd send here.
      const categoryThinFacet = filteredCatPosts.length < 2;

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
          potentialAction: { "@type": "ReadAction", target: canonical },
          // breadcrumb @id cross-reference links this CollectionPage to its
          // BreadcrumbList entity so Google's Knowledge Graph can resolve the
          // navigation hierarchy for category hub pages — matches the pattern
          // used on every other dynamic page type (blog, glossary, service, etc.).
          breadcrumb: { "@id": `${canonical}#breadcrumb` },
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (filteredCatPosts.length > 0) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "ItemList",
          name:       catMeta.title,
          url:        canonical,
          numberOfItems: filteredCatPosts.length,
          itemListElement: filteredCatPosts.map((p, i) => ({
            "@type":    "ListItem",
            position:   i + 1,
            name:       p.title,
            url:        `${siteUrl}/blog/${p.slug}`,
          })),
        }, null, 2));
      }

      // pSEO Pass 4: emit noindex header + meta when the facet is thin.
      // Server-side header is the authoritative signal for crawlers that
      // skip JavaScript; the in-head meta covers HTML-only parsers.
      if (categoryThinFacet) {
        res.setHeader("X-Robots-Tag", "noindex, follow");
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
          ...(categoryThinFacet
            ? [`  <meta name="robots" content="noindex, follow" />`]
            : []),
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

      // pSEO Pass 4: noindex thin tag facets (< 2 posts) for the same
      // reason as thin category hubs — a tag page that wraps a single
      // article is a near-duplicate SERP destination of the article
      // itself. Page stays accessible; only the indexability bit flips.
      const tagThinFacet = filteredTagPosts.length < 2;
      if (tagThinFacet) {
        res.setHeader("X-Robots-Tag", "noindex, follow");
      }

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
          potentialAction: { "@type": "ReadAction", target: canonical },
          // breadcrumb @id cross-reference — mirrors the pattern on all other
          // dynamic page types; without it Google's Knowledge Graph treats the
          // BreadcrumbList as an orphan entity unconnected to this CollectionPage.
          breadcrumb: { "@id": `${canonical}#breadcrumb` },
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
          ...(tagThinFacet
            ? [`  <meta name="robots" content="noindex, follow" />`]
            : []),
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

      // FAQPage schema enables FAQ rich results for high-intent "vs" queries.
      // COMPARE_FAQS mirrors comparisons.ts faqItems exactly so crawlers and
      // SPA navigation see identical question sets — consistency is important
      // for Google's FAQ rich-result deduplication logic.
      // inLanguage: "en" on every acceptedAnswer is required by the site-wide
      // FAQ schema rules (GEO/AEO compliance, matches all other FAQPage nodes).
      const faqMainEntity = (COMPARE_FAQS[slug] ?? []).map((faq) => ({
        "@type": "Question",
        name:    faq.question,
        answerCount: 1,
        acceptedAnswer: {
          "@type":     "Answer",
          text:        stripHtml(faq.answer),
          inLanguage:  "en",
        },
      }));

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
            datePublished: COMPARE_PAGE_CREATED[slug] ?? STATIC_PAGE_CREATED["/compare"] ?? "2024-09-01",
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
            datePublished: COMPARE_PAGE_CREATED[slug] ?? STATIC_PAGE_CREATED["/compare"] ?? "2024-09-01",
            ...(COMPARE_PAGE_LASTMOD[slug] ? { dateModified: COMPARE_PAGE_LASTMOD[slug] } : {}),
            // SpeakableSpecification enables voice-assistant extraction of the comparison
            // headline for queries like "agency vs in-house SEO" — mirrors the speakable
            // coverage on service detail pages and other decision-intent pages.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            breadcrumb:    { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
          // softwareVersion marks each tool as a versioned, maintained application —
          // Google Rich Results and AI rankers prefer versioned SoftwareApplication
          // entities over unversioned ones when surfacing tools in "best fintech SEO
          // tools" and "free fintech marketing tools" queries. Version string kept
          // static at "1.0" and bumped manually when a tool undergoes major changes.
          softwareVersion:      "1.0",
          description:          toolMeta.description,
          url:                  canonical,
          inLanguage:           "en",
          // availableLanguage is the explicit per-locale signal AI rankers and
          // hreflang validators read first; the bare `inLanguage: "en"` only
          // documents the runtime language. Listing both keeps us aligned with
          // schema.org guidance for international audiences and gives Google a
          // clean target when future locales are added.
          availableLanguage:    ["en"],
          applicationCategory:  "FinanceApplication",
          operatingSystem:      "Web",
          // browserRequirements states the runtime expectation explicitly so
          // Google Rich Results and AI rankers know the tool is fully
          // browser-resident — no install, no native dependency, no payment.
          browserRequirements:  "Requires JavaScript. Requires HTML5.",
          isAccessibleForFree:  true,
          offers: {
            "@type":        "Offer",
            price:          "0",
            priceCurrency:  "USD",
            availability:   "https://schema.org/InStock",
            url:            canonical,
          },
          // creator + provider are both pointed at the org @id so AI engines
          // resolving SoftwareApplication.creator.name surface "FintechPressHub"
          // verbatim. Without `creator`, citation engines often drop attribution
          // entirely on tool pages and surface the bare URL instead.
          creator:       { "@id": `${siteUrl}#organization` },
          provider:      { "@id": `${siteUrl}#organization` },
          publisher:     { "@id": `${siteUrl}#organization` },
          // audience signals the intended professional segment. AEO engines
          // (Perplexity, Google AI Overviews) use audience signals to filter
          // out tools that look generic and prefer ones with clear ICP.
          audience: {
            "@type":          "Audience",
            audienceType:     "Fintech marketing & SEO professionals",
          },
          // license points at the human + machine-readable AI usage policy
          // already published at /editorial-guidelines#ai-citation-policy and
          // mirrored in /.well-known/ai.txt. This closes the loop between the
          // tool's structured data and the site-wide citation/training rules.
          license:       `${siteUrl}/editorial-guidelines#ai-citation-policy`,
          datePublished: STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
          ...(TOOL_PAGE_LASTMOD[slug] ? { dateModified: TOOL_PAGE_LASTMOD[slug] } : {}),
          potentialAction: { "@type": "UseAction", target: canonical },
          ...(TOOLS_FEATURE_LIST[slug]
            ? {
                featureList: TOOLS_FEATURE_LIST[slug],
                // Re-emitting the feature list as a comma-joined `keywords`
                // string gives Google's keyword-matching layer a second
                // surface to read — schema.org accepts both, and AEO rankers
                // (Perplexity in particular) bias on `keywords` over
                // `featureList` when scoring topical relevance.
                keywords:    TOOLS_FEATURE_LIST[slug]!.join(", "),
              }
            : {}),
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
            "@type":      "Question",
            name:         question,
            answerCount:  1,
            // Per-Question dateCreated + author + inLanguage mirror the blog
            // FAQ enrichment from Round 4. AEO rankers (Perplexity, Google AI
            // Overviews, Bing/Copilot) prefer attributed, dated Q&As when
            // ranking citation candidates — an undated, anonymous Q&A loses
            // to one with explicit provenance every time, even when the
            // answer text is identical.
            dateCreated:  TOOL_PAGE_LASTMOD[slug] ?? STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
            inLanguage:   "en",
            author:       { "@id": `${siteUrl}#organization` },
            acceptedAnswer: {
              "@type":     "Answer",
              text:        stripHtml(answer),
              dateCreated: TOOL_PAGE_LASTMOD[slug] ?? STATIC_PAGE_CREATED["/tools"] ?? "2024-01-01",
              inLanguage:  "en",
              author:      { "@id": `${siteUrl}#organization` },
            },
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
        breadcrumb:    { "@id": `${canonical}#breadcrumb` },
        potentialAction: { "@type": "ReadAction", target: canonical },
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

        const dynamicLastmod = await getDynamicPageLastmod(reqPath);
        const pageLastmod = dynamicLastmod ?? STATIC_PAGE_LASTMOD[reqPath];

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
            breadcrumb:   { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            // SearchAction declares that this collection page supports full-text
            // search — enables Google's Sitelinks Search Box for /blog in SERPs
            // and provides AI agents a machine-readable interface to query the blog.
            potentialAction: {
              "@type":  "SearchAction",
              target: {
                "@type":       "EntryPoint",
                urlTemplate:   `${siteUrl}/blog?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
            breadcrumb: { "@id": `${canonical}#breadcrumb` },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
                    ? {
                        price:            plan.priceMonthly,
                        priceCurrency:    "USD",
                        priceSpecification: {
                          "@type":         "UnitPriceSpecification",
                          price:           plan.priceMonthly,
                          priceCurrency:   "USD",
                          billingDuration: "P1M",
                          unitText:        "month",
                        },
                      }
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
              answerCount: 1,
              acceptedAnswer: { "@type": "Answer", text: stripHtml(answer) },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
          // SpeakableSpec targets both the H1 and the .geo-answer-block paragraph
          // so voice assistants and AI answer engines extract the direct-answer
          // summary in addition to the page headline.
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
            // SpeakableSpecification: extended to include .geo-answer-block (GEO audit)
            // so AI citation engines extract the direct-answer paragraph in addition
            // to the H1 for "fintech guest post" and "write for us fintech" queries.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".geo-answer-block"],
            },
            breadcrumb:   { "@id": `${canonical}#breadcrumb` },
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

          // HowTo — enables step-rich results for "how to write for FintechPressHub"
          // queries. Mirrors the HowTo emitted by PageMeta on the client but placed
          // in SSR so Googlebot can index it without executing JavaScript (AEO audit).
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "HowTo",
            "@id":        `${canonical}#howto`,
            name:         "How to Submit a Fintech Guest Post to FintechPressHub",
            description:  "Submit a high-quality fintech guest post and earn up to 2 permanent dofollow backlinks from our publication serving 50,000+ monthly readers.",
            totalTime:    "PT3H",
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            step: [
              {
                "@type":   "HowToStep",
                position:  1,
                name:      "Read the contributor guidelines",
                text:      "Review our editorial standards, topical scope, and link policy before pitching.",
                url:       `${canonical}#guidelines`,
              },
              {
                "@type":   "HowToStep",
                position:  2,
                name:      "Submit your pitch",
                text:      "Fill in the pitch form with your proposed headline, a 2–3 sentence summary, and a short author bio.",
                url:       `${canonical}#pitch-form`,
              },
              {
                "@type":   "HowToStep",
                position:  3,
                name:      "Receive editorial feedback",
                text:      "Our team reviews every pitch within 2–3 business days. You will get a clear accept, revise, or decline with notes.",
              },
              {
                "@type":   "HowToStep",
                position:  4,
                name:      "Write and submit your article",
                text:      "Once accepted, write your 800–1,500 word article to our style guide and submit as a Google Doc with comment access.",
              },
              {
                "@type":   "HowToStep",
                position:  5,
                name:      "Publication and link placement",
                text:      "After editorial sign-off, your article is published with your author bio and up to 2 permanent dofollow backlinks.",
              },
            ],
          }, null, 2));

          // FAQPage — expanded from 3 to 5 Q&As to match all visible FAQ accordion
          // entries (AEO audit). Targets queries: "how to write for FintechPressHub",
          // "do you accept AI articles", "what fintech topics do you publish",
          // "is there a dofollow link", "how long to hear back", "word count".
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
            dateModified:  pageLastmod ?? "2026-05-15",
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
                  text:    "Yes. High-quality submissions that meet our editorial standards receive up to 2 permanent dofollow backlinks. Links must be contextually relevant and placed naturally within the article — not in the author bio. Sponsored-content link placements are handled separately under our content partnership programme.",
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
              {
                "@type": "Question",
                name:    "How long does it take to hear back on a pitch?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    "We review all pitches within 2–3 business days. If your topic is a strong fit you will receive an acceptance email with a brief scope doc and a suggested deadline. Off-niche or under-specified pitches are declined with a short note.",
                },
              },
              {
                "@type": "Question",
                name:    "What word count does FintechPressHub require for guest posts?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:    "Articles must be between 800 and 1,500 words. Every word must earn its place — tightly scoped, deeply researched pieces consistently outperform padded long-form. Thin or AI-generated content is rejected at pitch stage.",
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
            potentialAction: { "@type": "ReadAction", target: canonical },
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
          // Covers /privacy-policy, /refund-policy, /cookie-policy, /terms,
          // /editorial-guidelines, /community-guidelines, and any future static
          // pages not yet given a dedicated handler above.
          const pageCreated = STATIC_PAGE_CREATED[reqPath];
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
            ...(pageCreated ? { datePublished: pageCreated } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // SpeakableSpecification added to all catch-all pages so voice
            // assistants and AI citation engines can extract at least the page
            // headline for policy/guideline queries (e.g. "what are
            // FintechPressHub's editorial guidelines?").
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1"],
            },
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
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
          ...(pageLastmod ? { dateModified: pageLastmod } : {}),
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
    // Also advertise the LLM-readable Markdown alternates (mirrors the
    // # LLM-Content: hints in robots.txt) so AI engines can fetch the
    // higher-fidelity content index without guessing the path.
    res.setHeader(
      "Link",
      `<${patches.canonical}>; rel="canonical", ` +
      `<${patches.canonical}>; rel="cite-as", ` +
      `<${siteUrl}/llms.txt>; rel="alternate"; type="text/plain"; title="LLM content index", ` +
      `<${siteUrl}/llms-full.txt>; rel="alternate"; type="text/plain"; title="LLM full content index"`,
    );
    // Emit Last-Modified so crawlers can revalidate efficiently without
    // re-downloading the full HTML. Uses the per-page dateModified computed
    // in the route branch, or falls back to the static lastmod map.
    const lastModDate = patches.dateModified ?? (STATIC_PAGE_LASTMOD as Record<string, string | undefined>)[req.path];
    if (lastModDate) {
      try {
        res.setHeader("Last-Modified", new Date(lastModDate).toUTCString());
      } catch { /* ignore invalid date strings */ }
    }
    // ETag for conditional GET — derived from dateModified so the token changes
    // automatically whenever a post is materially updated (lastMaterialUpdateAt).
    // Enables CDNs (Hostinger Nginx, Cloudflare) and crawlers to revalidate
    // efficiently: a 304 Not Modified carries no body, saving 3–8 KB per hit and
    // reducing both crawl budget usage and server load under heavy bot pressure.
    // Uses a weak ETag (W/"…") because the HTML varies only by content, not by
    // byte-for-byte representation — appropriate for SSR responses.
    if (lastModDate) {
      try {
        const etag = `W/"${Buffer.from(lastModDate).toString("base64").slice(0, 24)}"`;
        res.setHeader("ETag", etag);
        // Manual If-None-Match check — more reliable than req.fresh across
        // Express 4/5 and reverse-proxy configs (Hostinger Nginx may strip
        // conditional headers before they reach the Node.js process, so we
        // check both the direct header and the normalised value).
        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `"${etag}"`)) {
          res.status(304).end();
          return;
        }
      } catch { /* ignore ETag generation errors */ }
    }
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
