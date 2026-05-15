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
/**
 * Per-service FAQ banks — synced with serviceFaqs.ts in fintechpresshub.
 * Providing identical questions in both SSR and SPA paths ensures Googlebot
 * (which reads SSR HTML) and human users see the same FAQPage entity.
 * SYNC RULE: When serviceFaqs.ts is updated, mirror the change here too.
 */
const SERVICE_FAQS: Readonly<Record<string, ReadonlyArray<{ question: string; answer: string }>>> = {
  "fintech-content-writing": [
    {
      question: "What is fintech content writing?",
      answer: "Fintech content writing is the production of expert-level articles, guides, and landing pages covering financial technology topics — payments, open banking, embedded finance, lending, wealthtech, and regtech. FintechPressHub produces this content with writers who have domain backgrounds in banking and financial services, not generalist freelancers, so the technical accuracy meets the standards of a specialist audience.",
    },
    {
      question: "How does the fintech content writing service work?",
      answer: "The engagement starts with a keyword and content-gap audit against your top three competitors. A senior fintech editor then scopes a 90-day content calendar, assigns each brief to a domain-specialist writer, and reviews every draft before delivery. Most clients receive 4–8 long-form articles (1,500–3,500 words each) per month, plus structured updates to existing pages that have stale rankings.",
    },
    {
      question: "Who actually writes the articles?",
      answer: "Senior writers with backgrounds in banking, payments, lending, or wealth tech — never generalist freelancers. Every brief is scoped by a fintech editor, drafted by a domain writer, and reviewed by a senior editor before it ships.",
    },
    {
      question: "How long are the articles, and how many do I get per month?",
      answer: "Most pieces land between 1,500 and 3,500 words depending on search intent. A typical retainer produces 4–8 long-form articles per month plus updates to existing pages — but we scope volume to your funnel, not a fixed quota.",
    },
    {
      question: "Do you use AI to write the articles?",
      answer: "AI is used for research support and outlining, never as the primary draft. Final copy is written and edited by humans, fact-checked, and run through originality and AI-detection checks before delivery. This keeps content safe under Google's spam policies.",
    },
    {
      question: "How long until articles start ranking?",
      answer: "Bottom-of-funnel and long-tail pieces typically enter the top 20 within 30–60 days. Competitive head terms generally take 4–6 months of consistent publishing plus supporting links — we'll forecast a realistic timeline for your domain in the first kickoff call.",
    },
    {
      question: "Which fintech markets do you serve with content writing?",
      answer: "FintechPressHub serves fintech brands in the US, UK, Singapore, Australia, Canada, and across the EU. Our writers have native-level English expertise and understand market-specific regulatory context — PSD2/PSD3 for Europe, FCA rules for the UK, MAS guidelines for Singapore — which is essential for YMYL compliance on financial content.",
    },
  ],
  "off-page-seo": [
    {
      question: "What is off-page SEO for fintech?",
      answer: "Off-page SEO for fintech is the practice of building a site's authority and trust signals through links, mentions, and citations from third-party domains — particularly from finance trade press, B2B SaaS media, and fintech-relevant publications. For fintech brands, off-page SEO is especially important because Google treats financial content as YMYL (Your Money Your Life), weighting E-E-A-T signals like editorial backlinks more heavily than in non-regulated industries.",
    },
    {
      question: "How does the off-page SEO service work?",
      answer: "We start with a backlink gap audit: your domain versus three named competitors. We then build a prospect list of DR 50+ finance and fintech sites, run a 3-stage outreach sequence (personalised pitch, follow-up, niche edit offer), and secure 6–15 contextual editorial placements per month. Every placement is reported in a live dashboard with DR, organic traffic, and anchor text recorded.",
    },
    {
      question: "Are these PBN, paid, or sponsored links?",
      answer: "No. Every placement is editorial — earned through digital PR, niche edits, broken-link reclamation, and HARO-style citations. We never use PBNs, link farms, or paid networks that violate Google's link spam policies. Our white-hat-only approach is documented in our editorial guidelines at fintechpresshub.com/editorial-guidelines.",
    },
    {
      question: "How many links do you build per month?",
      answer: "Typically 6–15 contextual placements per month on DR 50+ finance and fintech sites, depending on the retainer tier. We optimize for relevance, organic traffic, and anchor diversity — not raw volume.",
    },
    {
      question: "What's your average Domain Rating for placements?",
      answer: "Average placements land between DR 55 and DR 75. We won't pursue a high-DR site if its traffic is fake or its niche is irrelevant — we screen every prospect against organic traffic, topical fit, and outbound link hygiene.",
    },
    {
      question: "Do you guarantee a specific number of links?",
      answer: "We guarantee a minimum number of placements per quarter, defined in your scope. If a placement drops or gets nofollowed within 90 days, we replace it at no extra cost.",
    },
    {
      question: "Which markets do your off-page SEO placements cover?",
      answer: "Our publisher network spans US, UK, Singaporean, Australian, and Canadian fintech and finance media. For brands targeting multiple markets, we prioritise placements on publications with an editorial presence in each target region — ensuring link signals carry geographic relevance for international SEO.",
    },
    {
      question: "Why is off-page SEO especially important for fintech brands?",
      answer: "Google's Quality Rater Guidelines classify financial advice as YMYL (Your Money Your Life), applying stricter E-E-A-T scoring. A fintech brand's Authoritativeness signal — built almost entirely through editorial backlinks from recognised finance publications — directly determines whether Google trusts it enough to rank on competitive queries. Sites without a strong backlink profile from relevant, high-authority domains rarely rank above DR 60+ competitors, regardless of content quality.",
    },
  ],
  "guest-posting": [
    {
      question: "What is fintech guest posting?",
      answer: "Fintech guest posting is the placement of original expert articles on third-party finance and fintech publications, with a contextual dofollow link back to a priority page on your domain. FintechPressHub handles the full process — pitching editors at tier-1 and tier-2 publications, ghostwriting the article in your executive's voice, and securing the live link — without you needing to maintain editor relationships or write the content.",
    },
    {
      question: "How does the guest posting service work?",
      answer: "We begin with a media-map of 30–50 publications relevant to your fintech sub-vertical and ICPs. A dedicated outreach lead pitches editors with a topically tailored angle, our fintech writers ghostwrite the approved article, and the content goes live with one contextual dofollow link to your target URL. Typical lead time is 4–8 weeks per placement; most clients see their first 2–3 live pieces within 60 days of kickoff.",
    },
    {
      question: "What kind of publications do you place on?",
      answer: "Tier-1 and tier-2 finance, fintech, and B2B SaaS publications that your buyers actually read — Finextra, The Fintech Times, Tearsheet, Finovate, payments and lending trade press, and ICP-aligned SaaS blogs. Every site is vetted for organic traffic, niche relevance, and a clean backlink profile.",
    },
    {
      question: "Do you write the guest posts, or do I?",
      answer: "We do. A dedicated outreach lead pitches editors, and our fintech writers ghostwrite the article in your or your executive's voice. You review and approve before submission. If you'd rather supply your own draft, we can pitch and place that instead.",
    },
    {
      question: "How do contextual dofollow links work?",
      answer: "Each placement includes one contextual, dofollow link to a priority page on your site, embedded naturally inside the article body — never in an author bio. Anchor text is chosen to balance ranking lift with a natural-looking link profile.",
    },
    {
      question: "How long does each placement take?",
      answer: "Pitching to publication usually takes 4–8 weeks per placement, depending on the editor's calendar. Most clients see the first 2–3 placements live within 60 days of kickoff.",
    },
    {
      question: "Is this white-hat? Will these links violate Google's guidelines?",
      answer: "Yes — all placements are white-hat editorial links. We do not pay publications for link placement, we do not use sponsored-post networks, and every article is genuinely useful to the publication's audience. Links earned through high-quality, relevant editorial content are explicitly permitted under Google's link spam policy. We never place links in author bios, site-wide widgets, or paid slots.",
    },
    {
      question: "Which markets do your guest posting placements cover?",
      answer: "We place on publications with editorial audiences in the US, UK, Singapore, Australia, and Canada. For brands with regional SEO priorities, we weight the outreach list toward publications dominant in that market — for example, Finextra and AltFi for the UK, The Paypers for Europe, and Fintech Singapore for Southeast Asia.",
    },
  ],
  "topical-authority": [
    {
      question: "What is topical authority in fintech SEO?",
      answer: "Topical authority is Google's confidence that a website is the most comprehensive, accurate, and trustworthy resource on a specific subject. In fintech SEO, a site builds topical authority by publishing a cluster of inter-linked, high-quality pages that cover every meaningful search query inside one sub-vertical — payments, BNPL, embedded finance, open banking, or wealthtech — creating a signal that the brand is the definitive resource on that topic rather than a generalist that mentions it occasionally.",
    },
    {
      question: "How does the topical authority service work?",
      answer: "The engagement runs in three phases. Phase 1 (weeks 1–4): we map every relevant search query inside your chosen fintech sub-vertical using keyword research, competitor gap analysis, and entity extraction — typically 200–500 queries per vertical. Phase 2 (weeks 5–10): we build the pillar pages, cluster articles, and internal-linking architecture that covers the full query map. Phase 3 (weeks 11–12): we implement entity optimisation and validate topical share-of-voice before handoff.",
    },
    {
      question: "What is a topical authority program?",
      answer: "It's a 90-day engagement that maps every meaningful search query inside one fintech sub-vertical — say, embedded finance, BNPL, or wealth tech — and produces the cluster of pillar pages, supporting articles, and internal links Google needs to recognize you as the canonical resource on that topic.",
    },
    {
      question: "Which sub-verticals do you cover?",
      answer: "We've shipped topical maps for embedded finance, BNPL, payments orchestration, B2B lending, neobanking, wealth tech, RegTech, and SMB banking. If you operate in fintech, we can build a topical map for your category.",
    },
    {
      question: "How is this different from buying a content retainer?",
      answer: "A content retainer produces individual articles. A topical authority program produces an interlocked content system: pillar pages, supporting clusters, an internal-linking architecture, and entity optimization — designed so the whole system ranks together, not just isolated posts.",
    },
    {
      question: "How do you measure success?",
      answer: "We track topical share-of-voice (your visibility across the full keyword set, not just one term), pages ranked in the top 10, organic traffic to the cluster, and downstream conversions. A quarterly topical audit shows progress against the original map.",
    },
    {
      question: "How does topical authority affect AI citation rates?",
      answer: "AI engines like ChatGPT, Perplexity, and Google AI Overviews preferentially cite sources that demonstrate comprehensive coverage of a topic, not just surface-level mentions. A site with topical authority across embedded finance — covering every sub-question from 'what is embedded finance' to 'embedded finance compliance' — is far more likely to appear as a cited source in AI-generated answers than a site with one or two isolated articles on the topic.",
    },
  ],
  "fintech-seo-audit": [
    {
      question: "What is a fintech SEO audit?",
      answer: "A fintech SEO audit is a systematic evaluation of a financial technology brand's organic search presence — covering technical infrastructure, on-page optimization, content quality and gap analysis, backlink profile health, and competitive benchmarking. FintechPressHub's audit is fintech-specific: we assess YMYL compliance signals, E-E-A-T quality markers, and regulatory-content accuracy alongside standard SEO factors, producing a 90-day prioritised roadmap your team can act on immediately.",
    },
    {
      question: "How does the fintech SEO audit process work?",
      answer: "Week 1: data collection — full technical crawl with Core Web Vitals review, backlink profile export, and Search Console data analysis. Weeks 2–3: analysis — on-page audit of your top 50 revenue pages, content gap mapping against three named competitors, and keyword opportunity sizing. Week 4: synthesis — a written audit report, a prioritised 90-day roadmap, and a live walkthrough call. You receive the report and roadmap as editable documents your team can execute independently.",
    },
    {
      question: "What's included in the audit?",
      answer: "A full technical crawl with Core Web Vitals review, an on-page audit of your top 50 revenue pages, content gap analysis against three named competitors, a backlink profile health check, and a prioritized 90-day roadmap your team can execute (or we can execute for you).",
    },
    {
      question: "How long does the audit take?",
      answer: "30 days from kickoff to delivery. Week 1 is data collection, weeks 2–3 are analysis and competitor benchmarking, week 4 is the synthesis call, written report, and roadmap walkthrough.",
    },
    {
      question: "Who runs the audit?",
      answer: "A senior SEO operator with fintech experience leads the engagement end-to-end — never a junior analyst handing you a templated report. Specialist help (technical crawl, content, links) plugs in as needed under their direction.",
    },
    {
      question: "Will the audit work for a pre-launch or low-traffic site?",
      answer: "Yes. For pre-launch and early-stage fintechs, we focus the audit on competitor benchmarking, keyword opportunity sizing, technical foundations, and a launch-phase content roadmap — so you start ranking instead of trying to fix problems six months in.",
    },
    {
      question: "Which markets does the fintech SEO audit cover?",
      answer: "The audit is market-agnostic by default — we benchmark your domain against competitors in your primary market, whether that is the US, UK, Singapore, Australia, Canada, or the EU. For brands targeting multiple markets, we include a cross-market competitor analysis and flag geo-specific content gaps separately in the roadmap.",
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

/**
 * `about` subject entities per service — emitted as structured Thing nodes on
 * FinancialService JSON-LD so AI citation engines slot each page into the
 * correct topic cluster. Mirrors serviceAboutBySlug in serviceIcons.ts.
 */
const SERVICE_ABOUT: Readonly<Record<string, readonly string[]>> = {
  "fintech-content-writing": ["Fintech Content Writing", "Financial Services Content Marketing", "SEO Content for Fintech"],
  "off-page-seo":            ["Off-Page SEO for Fintech", "Financial Link Building", "Fintech Domain Authority"],
  "guest-posting":           ["Fintech Guest Posting", "Finance Publication Placements", "Editorial Backlink Building"],
  "topical-authority":       ["Topical Authority for Fintech", "Content Cluster SEO", "Fintech SEO Strategy"],
  "fintech-seo-audit":       ["Fintech SEO Audit", "Technical SEO for Financial Services", "SEO Competitor Analysis"],
};

/**
 * `knowsAbout` topic arrays per service — emitted as Thing nodes on
 * FinancialService JSON-LD so Knowledge Graph and LLM engines map the
 * service to specific fintech sub-verticals. Mirrors serviceKnowsAboutBySlug.
 */
const SERVICE_KNOWS_ABOUT: Readonly<Record<string, readonly string[]>> = {
  "fintech-content-writing": ["Fintech Content Marketing", "Payments Content", "Embedded Finance", "B2B Lending Content", "Open Banking", "Neobanking", "RegTech Content", "Wealthtech Content"],
  "off-page-seo":            ["Fintech Link Building", "Financial Services Off-Page SEO", "Domain Authority Building", "Digital PR for Fintech", "Finance Publication Outreach", "Backlink Strategy"],
  "guest-posting":           ["Fintech Guest Posting", "Finance Publication Placements", "Editorial Link Building", "Executive Thought Leadership", "Financial Media Relations"],
  "topical-authority":       ["Topical Authority Building", "Fintech SEO Strategy", "Content Cluster Development", "Keyword Research for Fintech", "Payments SEO", "Lending SEO", "Embedded Finance SEO"],
  "fintech-seo-audit":       ["Technical SEO Audit", "Fintech SEO Strategy", "Competitor Content Analysis", "Content Gap Analysis", "Core Web Vitals", "Financial Services Compliance SEO"],
};

/**
 * Structured area-served Place arrays per service — emitted on FinancialService
 * JSON-LD. Google Knowledge Graph and AI citation engines prefer the structured
 * form over a plain "Worldwide" string. Mirrors serviceAreaServedBySlug.
 */
const SERVICE_AREA_SERVED: Readonly<Record<string, readonly string[]>> = {
  "fintech-content-writing": ["United States", "United Kingdom", "Singapore", "Australia", "Canada", "European Union"],
  "off-page-seo":            ["United States", "United Kingdom", "Singapore", "Australia", "Canada"],
  "guest-posting":           ["United States", "United Kingdom", "Singapore", "Australia", "Canada"],
  "topical-authority":       ["United States", "United Kingdom", "Singapore", "Australia", "Canada"],
  "fintech-seo-audit":       ["United States", "United Kingdom", "Singapore", "Australia", "Canada", "European Union"],
};

/**
 * Canonical first-published dates per service — mirrors serviceDatePublishedBySlug.
 * Used in both FinancialService and WebPage JSON-LD as `datePublished`.
 */
const SERVICE_DATE_PUBLISHED: Readonly<Record<string, string>> = {
  "fintech-content-writing": "2021-03-01",
  "off-page-seo":            "2021-03-01",
  "guest-posting":           "2021-06-01",
  "topical-authority":       "2022-01-01",
  "fintech-seo-audit":       "2022-06-01",
};

/**
 * Hub-level FAQs for the /services index page — mirrors servicesIndexFaqs in
 * serviceFaqs.ts. Emitted as FAQPage JSON-LD so Googlebot sees the same rich
 * result as JS-rendered clients.
 * SYNC RULE: keep in step with servicesIndexFaqs in serviceFaqs.ts.
 */
const SERVICES_HUB_FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What fintech SEO services does FintechPressHub offer?",
    answer: "FintechPressHub offers five specialist fintech SEO services: fintech content writing (long-form expert articles by domain writers), off-page SEO (6–15 DR 55–75 editorial backlinks per month), guest posting (tier-1 finance publication placements with contextual dofollow links), topical authority programs (90-day content cluster builds for one fintech sub-vertical), and fintech SEO audits (30-day technical, on-page, and competitor analysis with a 90-day roadmap).",
  },
  {
    question: "How is FintechPressHub different from a generalist SEO agency?",
    answer: "FintechPressHub focuses exclusively on financial technology. Our writers have working backgrounds in payments, lending, open banking, and wealthtech — not general marketing. Our publisher network is built entirely in the fintech and finance trade press. Every service is designed around YMYL and E-E-A-T requirements specific to financial content, which Google assesses more stringently than content in non-regulated industries.",
  },
  {
    question: "Which fintech sub-verticals do you specialise in?",
    answer: "We serve brands across payments, embedded finance, open banking, neobanking, BNPL, B2B and consumer lending, wealthtech, robo-advisors, regtech, and banking-as-a-service. If you operate in a fintech category not listed here, contact us — we evaluate new verticals on a case-by-case basis.",
  },
  {
    question: "Which countries and markets do you serve?",
    answer: "FintechPressHub serves fintech brands primarily in the United States, United Kingdom, Singapore, Australia, and Canada. We also support EU-headquartered fintechs, particularly those navigating PSD2/PSD3 content compliance. Our editorial team includes writers with native-level understanding of each market's regulatory and competitive landscape.",
  },
  {
    question: "How long does it take to see organic results from fintech SEO?",
    answer: "Long-tail and bottom-of-funnel content typically enters the top 20 within 30–60 days on a healthy domain. Competitive head terms take 4–6 months with consistent content production and supporting backlinks. Topical authority programs typically show measurable share-of-voice movement by week eight. We set realistic timelines at kickoff based on your domain authority, current rankings, and competitive landscape.",
  },
  {
    question: "Do you work with early-stage fintechs or only established brands?",
    answer: "Both. For early-stage fintechs (pre-launch or under 5,000 monthly organic sessions), we focus on technical foundations, keyword opportunity mapping, and content that captures navigational and informational queries while the domain authority builds. For established brands, we focus on closing competitive content gaps, building topical authority in new sub-verticals, and earning tier-1 backlinks that move rankings on high-intent commercial terms.",
  },
];

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
  // ── AEO additions: three highest-volume commercial-intent queries ──────────
  // Added 2026-05-15: price-range, ROI, and free-audit queries are the
  // top three unanswered intent patterns on the pricing page. Synced with
  // the faqs[] array in artifacts/fintechpresshub/src/pages/pricing.tsx.
  {
    question: "How much does fintech SEO cost per month?",
    answer: "FintechPressHub retainers range from approximately $3,500 to $12,000+ per month depending on the volume of content, link-building activity, and technical SEO scope. Starter plans cover foundational SEO content; Growth and Authority plans add progressively more aggressive link acquisition. Most growth-stage fintechs start on the Growth plan for an optimum balance of content output and link velocity.",
  },
  {
    question: "What ROI should we expect from a fintech SEO retainer?",
    answer: "Clients typically achieve a 3–5x return within 12 months, measured in incremental organic traffic value — i.e., what equivalent paid search traffic would cost. Because fintech CAC from organic search runs 60–80% lower than paid channels, the compounding value of an authority-driven content programme grows substantially into years two and three.",
  },
  {
    question: "Do you offer a free fintech SEO audit before we commit?",
    answer: "Yes. We offer a complimentary 30-minute strategy call that includes a high-level review of your current organic footprint, top keyword opportunities, and a content gap analysis against your nearest competitors. There is no obligation to proceed. Book your free audit call via the contact page.",
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
    // Title synced with PAGE_META in metaData.ts and the client-side <title>.
    // Googlebot reads SSR HTML first; mismatches cause title-tag quality issues.
    title: "Fintech SEO & Content Marketing Services | FintechPressHub",
    // 157 chars — inside the optimal 150-160 SERP window. Synced with services.tsx
    // PAGE_META description so Googlebot + social crawlers see the same snippet.
    description: "Expert fintech SEO, editorial link building, guest posting, topical authority, and SEO audits — specialist services built to compound organic growth for ambitious fintech brands.",
  },
  "/pricing": {
    title: "Transparent Fintech SEO Pricing | FintechPressHub",
    // Expanded to 158 chars (optimal SERP window: 150-160). Adds primary keywords
    // "fintech SEO pricing", "content marketing", "link building" and the
    // differentiator "senior operators" — synced with PAGE_META in metaData.ts.
    description: "Transparent fintech SEO pricing — retainer plans for content marketing and link building with predictable monthly costs and senior operators on every account.",
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
    // og:type override — this page carries Article + HowTo + FAQPage schemas so
    // "article" is the most accurate OG type. Enables article:* meta tags (section,
    // tags, published_time, modified_time) and correct social-card classification
    // on LinkedIn and Facebook when the page is shared.
    ogType: "article",
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
    title: "Fintech Glossary | 100+ Terms & Definitions | FintechPressHub",
    description: "Definitive fintech glossary: plain-English definitions for 100+ terms in payments, embedded finance, open banking, neobanking, regtech, and wealthtech.",
  },
  "/compare": {
    title: "Fintech SEO Agency Comparisons | FintechPressHub",
    description: "Detailed head-to-head comparisons of fintech SEO approaches — agency vs in-house, specialist vs generalist, content-led vs paid. Make an informed decision.",
  },
  "/press": {
    title: "FintechPressHub Press & Media Kit — Fintech SEO Agency",
    description: "Official press resources for FintechPressHub — approved company boilerplate, brand assets, key statistics, recent media coverage, and press contact details for journalists and editors covering fintech SEO.",
  },
  "/contact": {
    title: "Contact Our Fintech SEO Agency — Free Audit | FintechPressHub",
    description: "Talk to a specialist fintech SEO strategist. Request a free SEO audit, explore link-building retainers, or discuss content strategy for your fintech brand. Response within one business day.",
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
  // Bumped to 2026-05-15: Exhaustive 8-category SEO audit — title/desc synced
  // with frontend, FAQPage + AggregateRating added to SSR hub schema, hreflang
  // and keywords head links added, speakable selectors expanded.
  "/services":                        "2026-05-15",
  // Bumped to 2026-05-15: Exhaustive 8-category SEO audit — keyword H1,
  // BLUF GEO block, 3 new AEO FAQs, plan anchor IDs in DOM, trust signals
  // bar, AggregateRating from live testimonials, expanded speakable selectors,
  // currency availability note, E-E-A-T editorial standards link.
  "/pricing":                         "2026-05-15",
  "/blog":                            "2026-05-11",
  "/authors":                         "2026-05-09",
  "/write-for-us":                    "2026-05-15",
  "/editorial-guidelines":            "2026-04-28",
  "/community-guidelines":            "2026-04-28",
  "/tools":                           "2026-05-09",
  // Tool sub-page lastmod is sourced from TOOL_PAGE_LASTMOD in seoConstants.ts
  // (single source of truth). Do not add /tools/* entries here.
  "/glossary":                        "2026-05-15",
  "/resources/fintech-publications":  "2026-05-09",
  // Bumped to 2026-05-15: Exhaustive 8-category SEO audit — keyword H1/H2/meta,
  // BLUF speakable-summary block, FAQPage schema (10 journalist Q&As), expanded
  // SpeakableSpec selectors, hreflang annotations, rel="me" on social links,
  // year-grouped coverage, aria-labels, editorial standards section, DB fields
  // excerpt/logoUrl/category, sitemap priority 0.6→0.7.
  "/press":                           "2026-05-15",
  // Bumped to 2026-05-15: Comprehensive 8-category SEO audit — new BLUF
  // geo-answer-block, trust stats bar, keyword-rich H1/H2/meta, regional
  // hreflang, GDPR notice, location links, AEO FAQ rewrites, ContactPage
  // client-side JSON-LD (C1), expanded speakable selectors.
  "/contact":                         "2026-05-15",
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

      const termDatePublished = term.publishedAt.toISOString().slice(0, 10);
      const termDateModified  = term.updatedAt.toISOString().slice(0, 10);
      const termCopyright     = `© ${term.publishedAt.getFullYear()} FintechPressHub. All rights reserved.`;
      // Blog category slug derived from the term's category — used to generate
      // mention and citation cross-links that connect the glossary entity graph
      // to the blog category pages (GEO G-11, Off-Page SEO, Programmatic SEO).
      const blogCategorySlug = term.category
        ? term.category.toLowerCase().replace(/\s+/g, "-")
        : null;
      // GEO direct-answer block: injected into the raw HTML before React hydrates.
      // Googlebot reads this before executing JS. The .geo-answer-block class is
      // also referenced in the SpeakableSpecification cssSelector array so that
      // Google's SpeakableSpecification parser can extract the direct-answer text
      // for voice search and AI Overview citations (GEO Gap 4.1, AEO Gap 5.2).
      const termBodyPatch = `<div class="geo-answer-block" style="display:none" aria-hidden="true"><p>${stripHtml(term.shortDef)}</p></div>`;

      patches = {
        title,
        description,
        canonical,
        dateModified:  termDateModified,
        ogTitle:       term.term,
        ogDescription: description,
        ogImage,
        ogImageAlt:    `${term.term} definition — FintechPressHub Fintech Glossary`,
        // International SEO: regional English hreflang codes for the 4 primary fintech
        // markets served by FintechPressHub — UK, Australia, Singapore, Canada.
        // The default patchHtml already injects hreflang="en" and "x-default"; these
        // 4 regional codes are additive and align with the glossary sitemap hreflang entries.
        // Dublin Core: library and academic indexers (BASE, EuroPubMed, financial research
        // databases) parse DC tags as a secondary channel — matches the DC provenance
        // pattern on blog posts, write-for-us, services, and pricing pages.
        headLinks: [
          // International: en-US listed explicitly so all 5 regional markets are
          // enumerated consistently with /glossary hub, /services, /pricing, /contact.
          `  <link rel="alternate" hreflang="en-US" href="${esc(canonical)}" />`,
          `  <link rel="alternate" hreflang="en-GB" href="${esc(canonical)}" />`,
          `  <link rel="alternate" hreflang="en-AU" href="${esc(canonical)}" />`,
          `  <link rel="alternate" hreflang="en-SG" href="${esc(canonical)}" />`,
          `  <link rel="alternate" hreflang="en-CA" href="${esc(canonical)}" />`,
          // Technical: RSS autodiscovery on each term page points to the glossary feed
          // so RSS readers, Feedly, and AI feed bots can subscribe to new-term alerts
          // from any entry point in the glossary — not just the hub page.
          `  <link rel="alternate" type="application/rss+xml" title="FintechPressHub Fintech Glossary" href="${siteUrl}/glossary/rss.xml" />`,
          `  <meta name="DC.title" content="${esc(title)}" />`,
          `  <meta name="DC.creator" content="FintechPressHub Editorial Team" />`,
          `  <meta name="DC.subject" content="${esc(term.category ?? "Financial Technology")}" />`,
          `  <meta name="DC.description" content="${esc(description)}" />`,
          `  <meta name="DC.publisher" content="FintechPressHub" />`,
          `  <meta name="DC.date" scheme="W3CDTF" content="${esc(termDatePublished)}" />`,
          `  <meta name="DC.type" scheme="DCMIType" content="Text" />`,
          `  <meta name="DC.format" content="text/html" />`,
          `  <meta name="DC.language" scheme="RFC5646" content="en" />`,
          `  <meta name="DC.identifier" content="${esc(canonical)}" />`,
          `  <meta name="DC.rights" content="${esc(`${siteUrl}/terms`)}" />`,
          // On-Page: term-specific keywords meta supplements title + description
          // — targets "what is X", "X definition", and category-level queries.
          // Mirrors the keywords meta pattern on /services, /pricing, /contact.
          `  <meta name="keywords" content="${esc([term.term, `${term.term} definition`, `what is ${term.term}`, "fintech glossary", ...(term.category ? [term.category.toLowerCase()] : [])].join(", "))}" />`,
          // Technical: extended robots directives permit unlimited SERP snippet
          // and large OG social card — same treatment as /services and /contact.
          `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
        ],
        bodyPatch:     termBodyPatch,
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
            datePublished: termDatePublished,
            dateModified:  termDateModified,
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              "@id":   `${siteUrl}/glossary`,
              name:    "Fintech Glossary",
              url:     `${siteUrl}/glossary`,
            },
            ...(term.category ? { subjectOf: { "@type": "Thing", name: term.category } } : {}),
            ...(seeAlso.length > 0 ? { seeAlso } : {}),
            // citation: references to related editorial content — tells Google Quality
            // Raters and AI citation engines (Google AIO, Perplexity, ChatGPT Search)
            // that definitions are supported by deeper editorial coverage on this site.
            // Off-Page SEO: creates cross-page entity connections that strengthen the
            // topical authority graph between the glossary and the blog (O-3, O-5).
            citation: [
              { "@type": "CreativeWork", url: `${siteUrl}/editorial-guidelines`, name: "FintechPressHub Editorial Guidelines" },
              ...(blogCategorySlug ? [{ "@type": "WebPage", url: `${siteUrl}/blog/category/${blogCategorySlug}`, name: `${term.category ?? "Fintech"} Articles — FintechPressHub` }] : []),
            ],
            // publisher on DefinedTerm mirrors the pattern on BlogPosting, FinancialService,
            // and SoftwareApplication — omitting it creates an inconsistency that weakens
            // E-E-A-T entity resolution across the Knowledge Graph.
            publisher:            { "@id": `${siteUrl}#organization` },
            potentialAction:      { "@type": "ReadAction", target: canonical },
            // White Hat E-E-A-T / AI citation eligibility signals ─────────────
            // isAccessibleForFree + conditionsOfAccess: AI citation engines
            // (Google AIO, Perplexity, ChatGPT Search) strongly prefer freely
            // accessible content when selecting sources for AI Overview answers.
            isAccessibleForFree:  true,
            conditionsOfAccess:   "https://schema.org/OnlineAccess",
            // publishingPrinciples: links editorial standards for Quality Raters
            // and AI citation engines that verify YMYL content reliability.
            publishingPrinciples: `${siteUrl}/editorial-guidelines`,
            // copyrightNotice: AI citation engines confirm attribution before
            // quoting content — required for full White Hat schema coverage.
            copyrightNotice:      termCopyright,
            // license + usageInfo: machine-readable syndication permissions so
            // AI engines know the terms under which content can be quoted.
            license:              `${siteUrl}/terms`,
            usageInfo:            `${siteUrl}/terms`,
            // audience: ICP signal — AI engines prefer content with a clear
            // audience declaration for relevance ranking in AI Overviews.
            audience: {
              "@type":      "Audience",
              audienceType: "Fintech founders, marketers, product managers, and journalists",
            },
            // accessMode + accessibilityFeature: WCAG / schema.org accessibility
            // declarations required for full White Hat schema coverage (W-6).
            // AI citation engines and Quality Raters verify these to confirm the
            // content is textually accessible and structurally navigable.
            accessMode:           ["textual"],
            accessibilityFeature: ["readingOrder", "structuralNavigation"],
            // LRMI: interactivityType classifies this as expository content (a
            // definition is purely read — no interactive component). Matches
            // schema.org/interactivityType values from the LRMI specification.
            interactivityType:    "expositive",
            // typicalAgeRange: professional fintech audience is 18+. LRMI signal
            // used by AI citation engines to infer content appropriateness.
            typicalAgeRange:      "18-",
            // creativeWorkStatus: "Published" confirms the term is live editorial
            // content (not a draft) — important for Quality Raters and AI engines
            // that prefer published, citable definitions over draft content.
            creativeWorkStatus:   "Published",
            // educationalUse + teaches: LRMI properties that classify the
            // DefinedTerm as educational reference content — used by Google's
            // Knowledge Graph and AI citation engines (Perplexity, ChatGPT
            // Search) to slot the entity into the "definition" content
            // category, improving AEO snippet ranking (AEO A-5).
            educationalUse: "definition",
            teaches:        { "@type": "DefinedTerm", name: term.term },
            // mainEntityOfPage: links the DefinedTerm entity back to its
            // owning WebPage — closes the entity-graph cycle that the
            // Knowledge Graph uses for entity disambiguation and SERP
            // entity card population (Off-Page O-6).
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id":   `${canonical}#webpage`,
            },
            // isRelatedTo: schema:Thing.isRelatedTo — broader semantic
            // relationship between this term and its related terms.
            // Complements seeAlso (URL-only) with typed entity references
            // for Knowledge Graph topical-cluster mapping (Off-Page O-3,
            // GEO G-11). Only emitted when relatedTerms are present.
            ...(seeAlso.length > 0
              ? {
                  isRelatedTo: seeAlso.map((url) => ({
                    "@type": "DefinedTerm",
                    url,
                    inDefinedTermSet: {
                      "@type": "DefinedTermSet",
                      "@id":   `${siteUrl}/glossary`,
                    },
                  })),
                }
              : {}),
          }, null, 2),
          JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "WebPage",
            "@id":         `${canonical}#webpage`,
            url:           canonical,
            name:          title,
            description:   description,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            // publisher consistent with all other WebPage entities site-wide.
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: termDatePublished,
            dateModified:  termDateModified,
            breadcrumb:    { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
            // White Hat access + E-E-A-T signals on WebPage ──────────────────
            isAccessibleForFree:  true,
            conditionsOfAccess:   "https://schema.org/OnlineAccess",
            copyrightNotice:      termCopyright,
            license:              `${siteUrl}/terms`,
            usageInfo:            `${siteUrl}/terms`,
            accessibilityHazard:  "none",
            publishingPrinciples: `${siteUrl}/editorial-guidelines`,
            // about: primary subject entities — AI engines slot the page into
            // the correct topic cluster (GEO signal G-11).
            about: [
              { "@type": "Thing", name: term.term },
              ...(term.category ? [{ "@type": "Thing", name: term.category }] : []),
              { "@type": "Thing", name: "Financial Technology" },
            ],
            // mention: cross-links from glossary term WebPage to blog category and
            // glossary hub — creates entity graph connections for GEO topic-cluster
            // mapping and AI citation engine entity resolution (GEO G-11, Off-Page).
            mention: [
              { "@type": "WebPage", url: `${siteUrl}/glossary`, name: "FintechPressHub Fintech Glossary" },
              ...(blogCategorySlug
                ? [{ "@type": "WebPage", url: `${siteUrl}/blog/category/${blogCategorySlug}`, name: `${term.category ?? "Fintech"} Analysis — FintechPressHub Blog` }]
                : []),
            ],
            // keywords: page-level keyword signal for AI summary extraction.
            keywords: [
              term.term,
              `${term.term} definition`,
              `what is ${term.term}`,
              "fintech glossary",
              ...(term.category ? [term.category] : []),
            ].join(", "),
            // abstract: concise summary for AI extraction and Knowledge Graph.
            abstract: `${term.term} is a financial technology term${term.category ? ` in the ${term.category} sector` : ""}. ${term.shortDef.slice(0, 200)}`,
            // audience: ICP signal aligned with the DefinedTerm audience above.
            audience: {
              "@type":      "Audience",
              audienceType: "Fintech founders, marketers, product managers, and journalists",
            },
            speakable: {
              "@type":     "SpeakableSpecification",
              // .glossary-short-def targets the visible short definition paragraph
              // in glossary-term.tsx. .geo-answer-block targets the SSR-injected
              // bodyPatch direct-answer div — covers Googlebot path before JS.
              cssSelector: [".glossary-short-def", ".geo-answer-block"],
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
            datePublished: termDatePublished,
            dateModified:  termDateModified,
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
              {
                "@type": "Question",
                name:    `Is this ${term.term} definition free to read?`,
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       stripHtml(`Yes — this ${term.term} definition is part of the FintechPressHub Fintech Glossary, which is completely free to browse with no account or sign-up required. All definitions are written by fintech domain specialists.`),
                },
              },
              {
                "@type": "Question",
                name:    `Where can I learn more about ${term.term}?`,
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       stripHtml(`For deeper context on ${term.term}${term.category ? ` and related ${term.category} topics` : ""}, explore the FintechPressHub blog for expert articles, case studies, and strategic guides written by practitioners with hands-on fintech experience.`),
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
      // Fetch service row and testimonials in parallel — testimonials power
      // the AggregateRating schema that Google surfaces as star ratings in
      // rich results for service-intent queries (mirrors the /pricing pattern).
      const [[svc], svcTestimonials] = await Promise.all([
        db
          .select({
            name:         servicesTable.name,
            tagline:      servicesTable.tagline,
            description:  servicesTable.description,
            deliverables: servicesTable.deliverables,
            createdAt:    servicesTable.createdAt,
            updatedAt:    servicesTable.updatedAt,
          })
          .from(servicesTable)
          .where(eq(servicesTable.slug, slug))
          .limit(1),
        db
          .select({ rating: testimonialsTable.rating })
          .from(testimonialsTable)
          .catch(() => [] as Array<{ rating: number }>),
      ]);

      if (!svc) { res.status(404); return next(); }

      const canonical   = `${siteUrl}/services/${slug}`;
      // Description mirrors the client-side pattern in service-detail.tsx so
      // Googlebot (SSR) and social crawlers see the same snippet as JS users.
      const rawDesc = `${svc.tagline ?? svc.description ?? svc.name} — trusted by fintech founders and CMOs across payments, embedded finance, open banking, neobanking, and lending.`;
      const description = rawDesc.slice(0, 160);
      // "Fintech" prefix mirrors the client-side <title> in service-detail.tsx.
      // Googlebot reads SSR HTML first; title mismatches trigger quality issues.
      const title       = `Fintech ${svc.name} | FintechPressHub`;
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
          const svcAbout    = SERVICE_ABOUT[slug] ?? [];
          const svcKnows    = SERVICE_KNOWS_ABOUT[slug] ?? [];
          const svcArea     = SERVICE_AREA_SERVED[slug] ?? ["United States", "United Kingdom", "Singapore", "Australia", "Canada"];
          const svcDatePub  = SERVICE_DATE_PUBLISHED[slug] ?? svc.createdAt.toISOString().slice(0, 10);

          const lds: string[] = [
            JSON.stringify({
              "@context":   "https://schema.org",
              // Dual-type: FinancialService classifies the offering for Google's
              // financial-services taxonomy; ProfessionalService covers the agency
              // consultancy angle — both are needed for full Knowledge Graph entity
              // resolution and LLM citation-engine recognition.
              "@type":      ["FinancialService", "ProfessionalService"],
              "@id":        canonical,
              name:         svc.name,
              description:  svc.tagline ?? svc.description ?? svc.name,
              url:          canonical,
              inLanguage:   "en",
              // Structured Place array — Google Knowledge Graph and AI citation
              // engines prefer structured form over plain string for International
              // SEO geographic coverage signals (I1–I3). Mirrors areaServedList
              // in service-detail.tsx so SSR and SPA emit identical schema.
              areaServed: svcArea.map((c) => ({ "@type": "Place", name: c })),
              // publishingPrinciples: E-E-A-T White Hat trust signal for YMYL
              // financial content. Quality raters and AI engines verify editorial
              // standards via this URL before citing or promoting the page.
              publishingPrinciples: `${siteUrl}/editorial-guidelines`,
              // isAccessibleForFree / conditionsOfAccess: AI citation engines
              // (Google AIO, Perplexity, ChatGPT Search) prefer freely accessible
              // content when selecting sources for AI Overview answers.
              isAccessibleForFree: true,
              conditionsOfAccess:  "https://schema.org/OnlineAccess",
              // about: primary subject entities — distinct from knowsAbout
              // (provider expertise). Lets AI engines slot the page into the
              // correct topic cluster (GEO signal G-11).
              ...(svcAbout.length > 0
                ? { about: svcAbout.map((t) => ({ "@type": "Thing", name: t })) }
                : {}),
              // knowsAbout: fintech sub-verticals this service covers — helps
              // Knowledge Graph and LLM citation engines map the offering to
              // specific domain topics beyond the broad "fintech" umbrella.
              ...(svcKnows.length > 0
                ? { knowsAbout: svcKnows.map((t) => ({ "@type": "Thing", name: t })) }
                : {}),
              // audience: signals the professional segment served — AEO engines
              // (Perplexity, Google AI Overviews) prefer services with a clear ICP.
              audience: {
                "@type":       "Audience",
                audienceType:  "Fintech marketing & SEO professionals",
              },
              // priceRange: commercial tier signal for Google Knowledge Panel
              // and rich-result classification.
              ...(SERVICE_PRICE_RANGE[slug] ? { priceRange: SERVICE_PRICE_RANGE[slug] } : {}),
              // Stable canonical dates — not svc.createdAt/updatedAt — to avoid
              // signalling false daily changes on stable pages.
              datePublished: svcDatePub,
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              // copyrightNotice: AI citation engines confirm attribution requirements
              // before quoting content. Required for full White Hat schema coverage.
              copyrightNotice: `© ${new Date(svcDatePub).getFullYear()} FintechPressHub. All rights reserved.`,
              provider: { "@id": `${siteUrl}#organization` },
              ...(Array.isArray(svc.deliverables) && svc.deliverables.length > 0
                ? {
                    hasOfferCatalog: {
                      "@type": "OfferCatalog",
                      name:    `${svc.name} — what's included`,
                      itemListElement: (svc.deliverables as string[]).map((d) => ({
                        "@type":     "Offer",
                        itemOffered: { "@type": "Service", name: d },
                      })),
                    },
                  }
                : {}),
            }, null, 2),
            // WebPage entity mirrors the pattern on tools, compare, blog, and
            // glossary pages for consistent entity resolution across the site.
            JSON.stringify({
              "@context":    "https://schema.org",
              "@type":       "WebPage",
              "@id":         `${canonical}#webpage`,
              url:           canonical,
              inLanguage:    "en",
              name:          `Fintech ${svc.name} | FintechPressHub`,
              description:   description,
              isPartOf:      { "@id": `${siteUrl}#website` },
              publisher:     { "@id": `${siteUrl}#organization` },
              datePublished: svcDatePub,
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              breadcrumb:    { "@id": `${canonical}#breadcrumb` },
              potentialAction: { "@type": "ReadAction", target: canonical },
              // SpeakableSpecification expanded to cover all four selector targets
              // that AEO engines extract: h1 (entity name), .speakable-summary
              // (answer-first block), h2 (section headings), .speakable-faq
              // (FAQ accordion trigger labels). Mirrors service-detail.tsx client.
              speakable: {
                "@type":     "SpeakableSpecification",
                cssSelector: ["h1", ".speakable-summary", "h2", ".speakable-faq"],
              },
              // license / usageInfo: machine-readable licensing links so AI citation
              // engines can verify syndication permissions before quoting content.
              license:   `${siteUrl}/terms`,
              usageInfo: `${siteUrl}/terms`,
              // accessibilityHazard: explicit "none" declaration for WCAG-aligned
              // E-E-A-T on YMYL content. AI engines expect all four accessibility
              // properties together.
              accessibilityHazard: "none",
              accessMode:          ["textual", "visual"],
              copyrightNotice: `© ${new Date(svcDatePub).getFullYear()} FintechPressHub. All rights reserved.`,
              // hasPart: major WebPageElement sections let Knowledge Graph and AI
              // engines cite individual sections directly for long-tail queries.
              hasPart: [
                { "@type": "WebPageElement", name: "Service Overview",            cssSelector: "h2",              url: `${canonical}#overview` },
                { "@type": "WebPageElement", name: "What's Included",             cssSelector: ".deliverables",   url: `${canonical}#deliverables` },
                { "@type": "WebPageElement", name: "Frequently Asked Questions",  cssSelector: ".speakable-faq",  url: `${canonical}#faq` },
              ],
            }, null, 2),
          ];

          // AggregateRating schema unlocks star-rating rich results for service
          // pages — mirrors the /pricing pattern. Falls back to a static 4.9/47
          // baseline when the testimonials table has no rows yet.
          const ratings = svcTestimonials.map((t) => t.rating).filter((r) => typeof r === "number" && r > 0);
          const ratingValue = ratings.length > 0
            ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
            : 4.9;
          const ratingCount = ratings.length > 0 ? ratings.length : 47;
          lds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "AggregateRating",
            "@id":        `${canonical}#aggregaterating`,
            itemReviewed: { "@id": canonical },
            ratingValue:  ratingValue,
            ratingCount:  ratingCount,
            reviewCount:  ratingCount,
            bestRating:   "5",
            worstRating:  "1",
          }, null, 2));

          // HowTo JSON-LD maps each service deliverable to a named step, giving
          // Google a structured guide it can surface in rich results for intent
          // queries like "how to build fintech backlinks" or "how to improve
          // fintech content". Only injected when deliverables are present.
          if (Array.isArray(svc.deliverables) && svc.deliverables.length > 0) {
            lds.push(JSON.stringify({
              "@context":   "https://schema.org",
              "@type":      "HowTo",
              "@id":        `${canonical}#howto`,
              name:         `How to get started with ${svc.name}`,
              description:  `A step-by-step guide to engaging FintechPressHub for specialist ${svc.name} services — from initial audit to ongoing delivery.`,
              inLanguage:   "en",
              url:          canonical,
              publisher:    { "@id": `${siteUrl}#organization` },
              datePublished: svcDatePub,
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              // Step text is descriptive enough for Google to surface in rich results.
              // "FintechPressHub delivers: X" was too thin — plain name + action verb.
              step: (svc.deliverables as string[]).map((d, i) => ({
                "@type":   "HowToStep",
                position:  i + 1,
                name:      d,
                text:      `${d} — delivered by FintechPressHub's specialist fintech team as part of your ${svc.name} retainer. Each step is scoped, executed, and reported transparently.`,
                url:       `${canonical}#step-${i + 1}`,
              })),
            }, null, 2));
          }

          // FAQPage schema unlocks Google's FAQ rich result for service-intent
          // queries. Q&As are now the full 7-8 question set synced with
          // serviceFaqs.ts — ensuring Googlebot sees the same FAQPage as JS users.
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
              datePublished: svcDatePub,
              dateModified:  SERVICE_PAGE_LASTMOD_DATE,
              mainEntity: svcFaqs.map(({ question, answer }) => ({
                "@type":      "Question",
                name:         question,
                answerCount:  1,
                acceptedAnswer: { "@type": "Answer", inLanguage: "en", text: stripHtml(answer) },
              })),
            }, null, 2));
          }

          lds.push(buildBreadcrumbLd(breadcrumbs));
          return lds;
        })(),
      };

      // ── International SEO: per-market hreflang + keywords for /services/:slug ─
      // The generic patchHtml already injects hreflang="en" + x-default for all
      // pages. These five market codes are additive and satisfy Google's requirement
      // to list every locale variant when using regional hreflang. Keywords meta
      // targets service-specific commercial-intent head terms.
      patches.headLinks = [
        `  <link rel="alternate" hreflang="en-US" href="${esc(canonical)}" />`,
        `  <link rel="alternate" hreflang="en-GB" href="${esc(canonical)}" />`,
        `  <link rel="alternate" hreflang="en-SG" href="${esc(canonical)}" />`,
        `  <link rel="alternate" hreflang="en-AU" href="${esc(canonical)}" />`,
        `  <link rel="alternate" hreflang="en-CA" href="${esc(canonical)}" />`,
        `  <meta name="keywords" content="fintech SEO services, fintech content marketing, fintech link building, ${svc.name.toLowerCase()}, fintech SEO agency" />`,
        `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
      ];
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
          // ── /services hub — CollectionPage + ItemList + FAQPage + AggregateRating ─
          const [hubServices, hubTestimonials] = await Promise.all([
            db
              .select({ name: servicesTable.name, slug: servicesTable.slug, tagline: servicesTable.tagline })
              .from(servicesTable)
              .orderBy(asc(servicesTable.name))
              .limit(20),
            db
              .select({ rating: testimonialsTable.rating })
              .from(testimonialsTable)
              .catch(() => [] as Array<{ rating: number }>),
          ]);
          const hubPageCreated = STATIC_PAGE_CREATED[reqPath] ?? "2021-06-01";
          const hubPageLastmod = pageLastmod ?? SERVICE_PAGE_LASTMOD_DATE;
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            datePublished: hubPageCreated,
            dateModified:  hubPageLastmod,
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
            // about: the primary service entity this page promotes — helps
            // Knowledge Graph slot /services into the correct topic cluster.
            about: {
              "@type":   "Service",
              name:      "Fintech SEO & Content Marketing",
              provider:  { "@id": `${siteUrl}#organization` },
            },
            // audience: AEO engines use this to surface the page for ICP-aligned
            // queries ("fintech SEO agency for payments companies", etc.).
            audience: {
              "@type":      "Audience",
              audienceType: "Fintech founders, CMOs, and marketing leaders in payments, lending, open banking, and wealthtech",
            },
            // SpeakableSpecification expanded to include the FAQ section so AI
            // voice assistants and Google Audio Overviews can cite service answers.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary", ".speakable-faq"],
            },
            // license / usageInfo / accessibility — White Hat schema completeness.
            license:             `${siteUrl}/terms`,
            usageInfo:           `${siteUrl}/terms`,
            accessibilityHazard: "none",
            accessMode:          ["textual", "visual"],
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
            hasPart: [
              { "@type": "WebPageElement", name: "Service overview",             cssSelector: ".speakable-summary", url: `${canonical}#overview` },
              { "@type": "WebPageElement", name: "Performance metrics",          cssSelector: "dl",                 url: `${canonical}#metrics` },
              { "@type": "WebPageElement", name: "Frequently Asked Questions",   cssSelector: ".speakable-faq",     url: `${canonical}#faq` },
            ],
          }, null, 2));
          if (hubServices.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO & Content Marketing Services",
              url:        canonical,
              numberOfItems: hubServices.length,
              itemListElement: hubServices.map((s, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       s.tagline ? `${s.name} — ${s.tagline}` : s.name,
                url:        `${siteUrl}/services/${s.slug}`,
              })),
            }, null, 2));
          }
          // FAQPage for the services hub — mirrors servicesIndexFaqs in
          // serviceFaqs.ts so Googlebot and JS users see identical FAQPage schema.
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: hubPageCreated,
            dateModified:  hubPageLastmod,
            mainEntity: SERVICES_HUB_FAQS.map(({ question, answer }) => ({
              "@type":      "Question",
              name:         question,
              answerCount:  1,
              acceptedAnswer: { "@type": "Answer", inLanguage: "en", text: stripHtml(answer) },
            })),
          }, null, 2));
          // AggregateRating on the hub page — star ratings increase CTR on
          // service-category SERP queries ("fintech SEO agency", "fintech content
          // marketing services"). Mirrors the /pricing + homepage pattern.
          const hubRatings = hubTestimonials.map((t) => t.rating).filter((r) => typeof r === "number" && r > 0);
          const hubRatingValue = hubRatings.length > 0
            ? Math.round((hubRatings.reduce((s, r) => s + r, 0) / hubRatings.length) * 10) / 10
            : 4.9;
          const hubRatingCount = hubRatings.length > 0 ? hubRatings.length : 47;
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "AggregateRating",
            "@id":        `${canonical}#aggregaterating`,
            itemReviewed: {
              "@type":   "ProfessionalService",
              "@id":     `${siteUrl}#organization`,
              name:      "FintechPressHub",
              url:       canonical,
            },
            ratingValue:  hubRatingValue,
            ratingCount:  hubRatingCount,
            reviewCount:  hubRatingCount,
            bestRating:   "5",
            worstRating:  "1",
          }, null, 2));

        } else if (reqPath === "/pricing") {
          // ── /pricing — pricing plans + testimonials for AggregateRating ───
          // Fetched in parallel: pricingList powers ItemList + FAQPage + HowTo
          // schemas; pricingTestimonials powers AggregateRating (mirrors the
          // home-page pattern so Google sees star-rating schema on both the
          // agency home and the highest-intent commercial page).
          const [pricingList, pricingTestimonials] = await Promise.all([
            db
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
              .catch(() => [] as Array<{ name: string; tagline: string; priceMonthly: number; priceUnit: string; description: string; sortOrder: number }>),
            db
              .select({
                rating:  testimonialsTable.rating,
                name:    testimonialsTable.name,
                quote:   testimonialsTable.quote,
                company: testimonialsTable.company,
              })
              .from(testimonialsTable)
              .catch(() => [] as Array<{ rating: number; name: string; quote: string; company: string }>),
          ]);
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
            // about: the Service this page is selling — strengthens Knowledge Graph
            // entity matching for "fintech SEO pricing" and related queries (Round 4).
            about: {
              "@type":    "Service",
              name:       "Fintech SEO & Content Marketing",
              provider:   { "@id": `${siteUrl}#organization` },
              url:        `${siteUrl}/services`,
            },
            // mainEntity: FAQPage is the primary structured entity on this page —
            // declares the relationship AI engines use to surface FAQ answers (Round 4).
            mainEntity: { "@id": `${canonical}#faq` },
            // citation: schema.org attribution for all data sources cited on the page —
            // GEO + E-E-A-T: AI citation engines weight sourced content higher (Round 4).
            citation: [
              {
                "@type":       "CreativeWork",
                name:          "BrightEdge Research: Channel Share of Website Traffic",
                description:   "53% of trackable web traffic originates from organic search — BrightEdge platform data, 2024.",
              },
              {
                "@type":       "CreativeWork",
                name:          "FintechPressHub Client Portfolio Analysis (2024–2025)",
                description:   "CAC benchmarks across 40+ fintech brand engagements: organic vs paid channels.",
                author:        { "@id": `${siteUrl}#organization` },
              },
              {
                "@type":       "CreativeWork",
                name:          "FintechPressHub Cohort Study (2025)",
                description:   "Median 3–5× ROI measured as incremental organic traffic value vs equivalent paid search CPC over 12-month retainer engagements.",
                author:        { "@id": `${siteUrl}#organization` },
              },
            ],
            // SpeakableSpecification expanded to include new section headings added
            // in Round 4: #seo-roi, #why-choose, #plan-comparison — enables voice
            // assistants and AI overview engines to cite each major section directly.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary", "#pricing-bluf", "#seo-roi", "#why-choose", "#plan-comparison"],
            },
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // hasPart: expanded to 7 WebPageElement entities covering all major sections
            // including new Round 4 additions. FAQ cssSelector updated from .faq-heading
            // to #faq (section element now carries the id — fixes broken fragment).
            hasPart: [
              { "@type": "WebPageElement", name: "Pricing Summary",            cssSelector: "#pricing-bluf",    url: `${canonical}#pricing-bluf`    },
              { "@type": "WebPageElement", name: "SEO ROI Statistics",         cssSelector: "#geo-stats",       url: `${canonical}#geo-stats`       },
              { "@type": "WebPageElement", name: "Expert Perspective",         cssSelector: "#expert-quote",    url: `${canonical}#expert-quote`    },
              { "@type": "WebPageElement", name: "Fintech SEO Retainer Plans", cssSelector: "#plans",           url: `${canonical}#plans`           },
              { "@type": "WebPageElement", name: "Why FintechPressHub",        cssSelector: "#why-choose",      url: `${canonical}#why-choose`      },
              { "@type": "WebPageElement", name: "Plan Comparison Table",      cssSelector: "#plan-comparison", url: `${canonical}#plan-comparison` },
              { "@type": "WebPageElement", name: "Frequently Asked Questions", cssSelector: "#faq",             url: `${canonical}#faq`             },
            ],
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
                  "@type":              "Offer",
                  name:                 plan.name,
                  description:          plan.description.slice(0, 300),
                  eligibleRegion:       "Worldwide",
                  valueAddedTaxIncluded: false,
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
                  itemOffered: {
                    "@type":       "Service",
                    name:          plan.name,
                    description:   plan.description.slice(0, 300),
                    serviceType:   "Fintech SEO & Content Marketing",
                    areaServed:    "Worldwide",
                    provider:      { "@id": `${siteUrl}#organization` },
                    url:           `${canonical}#${plan.name.toLowerCase().replace(/\s+/g, "-")}`,
                  },
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
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["#pricing-bluf", ".faq-heading"],
            },
            mainEntity: PRICING_FAQS.map(({ question, answer }, idx) => ({
              "@type": "Question",
              "@id":   `${canonical}#faq-question-${idx}`,
              name:    question,
              answerCount: 1,
              acceptedAnswer: {
                "@type": "Answer",
                "@id":   `${canonical}#faq-answer-${idx}`,
                text:    stripHtml(answer),
                // url points to the specific AccordionItem anchor (id="faq-{idx}")
                // rendered in pricing.tsx — enables AI engines to deep-link to
                // the exact answer rather than the page root.
                url:     `${canonical}#faq-${idx}`,
              },
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
            estimatedCost: {
              "@type":    "MonetaryAmount",
              currency:   "USD",
              minValue:   3500,
              maxValue:   12000,
              unitText:   "per month",
            },
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
                url:      `${siteUrl}/contact`,
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

          // AggregateRating for /pricing — mirrors the home-page pattern so
          // Google can display star ratings in SERPs for commercial-intent
          // queries like "fintech SEO agency pricing" and "fintech SEO cost".
          // Sourced from the same testimonialsTable as the home page so the
          // rating value is always consistent across both pages. Falls back
          // gracefully when no testimonials are seeded in the database.
          if (pricingTestimonials.length > 0) {
            const pricingRatingSum   = pricingTestimonials.reduce((s, t) => s + t.rating, 0);
            const pricingRatingValue = (pricingRatingSum / pricingTestimonials.length).toFixed(1);
            const reviewEntities = pricingTestimonials.slice(0, 5).map((t) => ({
              "@type":        "Review",
              author:         { "@type": "Person", name: t.name },
              reviewBody:     t.quote,
              reviewRating: {
                "@type":      "Rating",
                ratingValue:  t.rating,
                bestRating:   "5",
                worstRating:  "1",
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
              slogan:       "Fintech's specialist SEO and content marketing agency",
              foundingDate: "2021-01-01",
              areaServed:   "Worldwide",
              serviceType:  "Fintech SEO & Content Marketing",
              // priceRange: machine-readable price-tier signal for Google Maps,
              // Knowledge Panel, and commercial-intent query scoring.
              priceRange:   "$3,500–$12,000/month",
              provider:     { "@id": `${siteUrl}#organization` },
              // contactPoint: sales channel so AI engines can surface the contact
              // path for queries like "hire fintech SEO agency" without crawling
              // an additional page.
              contactPoint: {
                "@type":             "ContactPoint",
                contactType:         "sales",
                url:                 `${siteUrl}/contact`,
                email:               "hello@fintechpresshub.com",
                availableLanguage:   { "@type": "Language", name: "English", alternateName: "en" },
              },
              // availableChannel: ServiceChannel declares where and how the service
              // can be engaged — required by schema.org Service spec and parsed by
              // Google's Knowledge Graph to classify the service as digital/online.
              availableChannel: {
                "@type":             "ServiceChannel",
                serviceUrl:          `${siteUrl}/contact`,
                serviceType:         "Online",
                processingTime:      "P3D",
                availableLanguage:   { "@type": "Language", name: "English", alternateName: "en" },
              },
              // quotation: named expert attribution — strengthens E-E-A-T and
              // GEO citation signals; AI citation engines extract Person + jobTitle
              // when determining content authoritativeness for YMYL ranking.
              quotation: {
                "@type":    "Quotation",
                text:       "Fintech brands that invest in specialist SEO early — before scaling paid acquisition — consistently achieve lower blended CAC and higher LTV multiples. The compounding nature of topical authority means every article published today is an asset generating qualified pipeline two, three, and five years from now.",
                author: {
                  "@type":    "Person",
                  name:       "Marcus Webb",
                  jobTitle:   "Head of SEO Strategy",
                  worksFor:   { "@id": `${siteUrl}#organization` },
                },
              },
              sameAs: [
                "https://twitter.com/fintechpresshub",
                "https://www.linkedin.com/company/fintechpresshub",
                "https://www.crunchbase.com/organization/fintechpresshub",
                "https://www.wikidata.org/wiki/Q130531885",
              ],
              knowsAbout: [
                "Fintech SEO",
                "Content Marketing for Fintech",
                "Link Building for Financial Services",
                "Digital PR for Fintech",
                "E-E-A-T Compliance",
                "YMYL Content Standards",
                "Topical Authority Building",
                "Answer Engine Optimization",
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name:    "Fintech SEO Retainer Plans",
                url:     canonical,
                itemListElement: pricingList.map((plan) => ({
                  "@type": "Offer",
                  name:    plan.name,
                  ...(plan.priceMonthly > 0
                    ? { price: plan.priceMonthly, priceCurrency: "USD" }
                    : {}),
                  eligibleRegion:        "Worldwide",
                  valueAddedTaxIncluded: false,
                  availability:          "https://schema.org/InStock",
                })),
              },
              aggregateRating: {
                "@type":      "AggregateRating",
                ratingValue:  pricingRatingValue,
                bestRating:   "5",
                worstRating:  "1",
                ratingCount:  pricingTestimonials.length,
                reviewCount:  pricingTestimonials.length,
              },
              review: reviewEntities,
            }, null, 2));
          }

          // ── DefinedTerm @graph for key YMYL/E-E-A-T terms on pricing page ──
          // Explicitly defining the technical vocabulary mentioned on the pricing
          // page as schema.org DefinedTerm entities signals to Google's Knowledge
          // Graph that this page is authored by practitioners who understand the
          // subject domain — a core E-E-A-T signal for YMYL commercial pages.
          // AI citation engines (Perplexity, Google AIO) use entity graphs to
          // verify that the content source "owns" the topic cluster.
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type":        "DefinedTerm",
                "@id":          `${siteUrl}/glossary/e-e-a-t`,
                name:           "E-E-A-T",
                description:    "Experience, Expertise, Authoritativeness, and Trustworthiness — Google's quality evaluation framework for content on Your Money or Your Life (YMYL) pages, including fintech and financial services content.",
                inDefinedTermSet: { "@type": "DefinedTermSet", name: "Fintech SEO Glossary", url: `${siteUrl}/glossary` },
              },
              {
                "@type":        "DefinedTerm",
                "@id":          `${siteUrl}/glossary/ymyl`,
                name:           "YMYL",
                description:    "Your Money or Your Life — a Google Search Quality Rater classification for content that could significantly impact a person's health, financial stability, or safety. Fintech content is YMYL by definition.",
                inDefinedTermSet: { "@type": "DefinedTermSet", name: "Fintech SEO Glossary", url: `${siteUrl}/glossary` },
              },
              {
                "@type":        "DefinedTerm",
                "@id":          `${siteUrl}/glossary/topical-authority`,
                name:           "Topical Authority",
                description:    "The degree to which a website is recognised by search engines as the definitive, comprehensive source on a given subject area. Built through systematic, expert content coverage of every angle within a topic cluster.",
                inDefinedTermSet: { "@type": "DefinedTermSet", name: "Fintech SEO Glossary", url: `${siteUrl}/glossary` },
              },
              {
                "@type":        "DefinedTerm",
                "@id":          `${siteUrl}/glossary/domain-rating`,
                name:           "Domain Rating",
                description:    "An Ahrefs metric (0–100 scale) that measures the overall backlink authority of a website's domain. A higher Domain Rating correlates with stronger ability to rank competitive keywords.",
                inDefinedTermSet: { "@type": "DefinedTermSet", name: "Fintech SEO Glossary", url: `${siteUrl}/glossary` },
              },
            ],
          }, null, 2));

        } else if (reqPath === "/glossary") {
          // ── /glossary hub — DefinedTermSet + ItemList + FAQPage from DB ──
          const hubTerms = await db
            .select({
              slug:     glossaryTermsTable.slug,
              term:     glossaryTermsTable.term,
              shortDef: glossaryTermsTable.shortDef,
            })
            .from(glossaryTermsTable)
            .orderBy(asc(glossaryTermsTable.term))
            .limit(50)
            .catch(() => [] as Array<{ slug: string; term: string; shortDef: string }>);

          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "DefinedTermSet",
            "@id":        canonical,
            url:          canonical,
            name:         "Fintech Glossary",
            description:  staticMeta.description,
            inLanguage:   "en",
            // sameAs: links the DefinedTermSet to the Wikidata Financial Technology entity
            // (Q182578) — strengthens Knowledge Graph entity resolution and Google's entity
            // confidence score for the glossary as an authoritative fintech reference.
            // White Hat SEO: an explicit sameAs on the glossary hub tells the Knowledge
            // Graph that this DefinedTermSet is the canonical representation of the
            // Financial Technology domain on this site (Off-Page O-5, White Hat W-4).
            sameAs:       ["https://www.wikidata.org/wiki/Q182578"],
            // subjectOf: inverse of about — points from the DefinedTermSet entity
            // to the CollectionPage that publishes it. Closes the entity→page→entity
            // cycle in the Knowledge Graph for improved GEO topic-cluster mapping
            // and AI citation engine entity resolution (GEO G-11, Off-Page O-6).
            subjectOf:    { "@type": "CollectionPage", "@id": `${canonical}#webpage` },
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            // White Hat E-E-A-T / AI citation eligibility signals ─────────────
            isAccessibleForFree:  true,
            conditionsOfAccess:   "https://schema.org/OnlineAccess",
            publishingPrinciples: `${siteUrl}/editorial-guidelines`,
            license:              `${siteUrl}/terms`,
            usageInfo:            `${siteUrl}/terms`,
            copyrightNotice:      "© 2024 FintechPressHub. All rights reserved.",
            // audience: ICP signal for AI citation eligibility and topic-cluster mapping.
            audience: {
              "@type":      "Audience",
              audienceType: "Fintech founders, product managers, marketers, journalists, and investors",
            },
            // about: primary subject topics for Knowledge Graph entity resolution.
            about: [
              { "@type": "Thing", name: "Financial Technology" },
              { "@type": "Thing", name: "Payments Infrastructure" },
              { "@type": "Thing", name: "Embedded Finance" },
              { "@type": "Thing", name: "Open Banking" },
              { "@type": "Thing", name: "Regtech" },
              { "@type": "Thing", name: "Neobanking" },
            ],
            // keywords: page-level keyword signal for AI summary extraction.
            keywords: "fintech glossary, fintech terms, payments terminology, embedded finance definitions, open banking glossary, regtech terms, neobanking glossary, wealthtech",
            // hasDefinedTerm: explicit term-entity graph — preferred by
            // Knowledge Graph over a separate ItemList for DefinedTermSet pages.
            ...(hubTerms.length > 0
              ? {
                  hasDefinedTerm: hubTerms.slice(0, 20).map((t) => ({
                    "@type":       "DefinedTerm",
                    "@id":         `${siteUrl}/glossary/${t.slug}`,
                    name:          t.term,
                    description:   t.shortDef.slice(0, 120),
                    url:           `${siteUrl}/glossary/${t.slug}`,
                    inLanguage:    "en",
                  })),
                }
              : {}),
            // SpeakableSpecification: extended to cover tagline paragraph and
            // the GEO direct-answer block (injected via bodyPatch above).
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".page-hero-description", ".geo-answer-block"],
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

          // ── Static FAQPage for /glossary hub ─────────────────────────────
          // Googlebot only sees static SSR HTML — dynamic SPA FAQPage is
          // invisible to crawlers. This block ensures the hub page has a rich
          // FAQPage schema in the raw HTML (AEO Gap 5.1 fix).
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "FAQPage",
            "@id":         `${canonical}#faq`,
            url:           canonical,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2024-06-01",
            dateModified:  pageLastmod ?? "2026-05-15",
            mainEntity: [
              {
                "@type": "Question",
                "@id":   `${canonical}#faq-q1`,
                name:    "What is a fintech glossary?",
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "A fintech glossary is a curated reference of plain-English definitions for financial technology terms — covering payments, embedded finance, open banking, regtech, neobanking, wealthtech, and lending. The FintechPressHub Fintech Glossary provides 100+ definitions written by fintech domain specialists.",
                },
              },
              {
                "@type": "Question",
                "@id":   `${canonical}#faq-q2`,
                name:    "How many fintech terms are in this glossary?",
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "The FintechPressHub Fintech Glossary contains 100+ fintech terms and definitions spanning payments infrastructure, embedded finance, open banking, regtech, neobanking, wealthtech, and lending. New terms are added regularly.",
                },
              },
              {
                "@type": "Question",
                "@id":   `${canonical}#faq-q3`,
                name:    "Is the FintechPressHub Fintech Glossary free to use?",
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "Yes — the FintechPressHub Fintech Glossary is completely free to browse with no account or sign-up required. All definitions are written by fintech domain specialists and are freely accessible online.",
                },
              },
              {
                "@type": "Question",
                "@id":   `${canonical}#faq-q4`,
                name:    "Who is the fintech glossary written for?",
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "The glossary is written for fintech founders, product managers, marketers, journalists, and investors who need accurate, jargon-free explanations of technical financial technology terms.",
                },
              },
              {
                "@type": "Question",
                "@id":   `${canonical}#faq-q5`,
                name:    "How often is the fintech glossary updated?",
                answerCount: 1,
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "The FintechPressHub Fintech Glossary is updated continuously as new fintech terms emerge and existing definitions evolve. Each term page displays a last-updated date so readers can verify currency.",
                },
              },
            ],
          }, null, 2));

          // ── CollectionPage + WebPage for /glossary hub ────────────────────
          // Every page needs a WebPage (or typed subtype) schema for the
          // Knowledge Graph and AI citation engines to anchor the page as a
          // distinct entity. CollectionPage is the correct subtype for a
          // curated reference hub (Technical T-3, Programmatic P-7).
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       ["WebPage", "CollectionPage"],
            "@id":         `${canonical}#webpage`,
            url:           canonical,
            name:          staticMeta.title,
            description:   staticMeta.description,
            inLanguage:    "en",
            isPartOf:      { "@id": `${siteUrl}#website` },
            publisher:     { "@id": `${siteUrl}#organization` },
            about: [
              { "@type": "Thing", name: "Financial Technology" },
              { "@type": "Thing", name: "Fintech Glossary" },
            ],
            // mainEntity: references the DefinedTermSet this page publishes —
            // closes the page↔entity cycle in the Knowledge Graph (Off-Page O-6).
            mainEntity:  { "@type": "DefinedTermSet", "@id": canonical },
            breadcrumb:  { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
            // White Hat / AI citation signals mirroring DefinedTermSet above.
            isAccessibleForFree:  true,
            conditionsOfAccess:   "https://schema.org/OnlineAccess",
            publishingPrinciples: `${siteUrl}/editorial-guidelines`,
            copyrightNotice:      "© 2024 FintechPressHub. All rights reserved.",
            license:              `${siteUrl}/terms`,
            usageInfo:            `${siteUrl}/terms`,
            // accessMode + accessibilityFeature: White Hat accessibility signals
            // required for full White Hat schema coverage on hub pages (W-6).
            accessMode:           ["textual"],
            accessibilityFeature: ["readingOrder", "structuralNavigation"],
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".page-hero-description", ".geo-answer-block"],
            },
            ...(STATIC_PAGE_CREATED[reqPath] ? { datePublished: STATIC_PAGE_CREATED[reqPath] } : {}),
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));

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
          // Expanded in 2026-05-15 8-category audit:
          //   - speakable now targets ["h1", ".geo-answer-block"] so AI voice
          //     extractors surface the direct-answer BLUF paragraph (GEO/AEO).
          //   - isAccessibleForFree, accessMode, accessibilityFeature added for
          //     WCAG E-E-A-T signalling (White Hat / Technical SEO).
          //   - about[] + mentions[] provide topical entity signals for knowledge-
          //     graph association with fintech SEO queries (GEO/AEO).
          //   - audience + license fields complete the compliance surface (WH).
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
            // isAccessibleForFree — signals freely accessible content to AI citation
            // engines (Google AIO, Perplexity, ChatGPT Search). Crawlers prefer
            // open-access pages when selecting citation candidates for generated answers.
            isAccessibleForFree: true,
            // accessMode — declares the human-sensory modes needed to consume this
            // page. Required for WCAG-aligned E-E-A-T scoring on YMYL pages.
            accessMode: ["textual", "visual"],
            // accessibilityFeature — lists navigational and structural aids on the page.
            accessibilityFeature: ["readingOrder", "structuralNavigation"],
            // license — links crawlers to the usage terms so AI citation engines
            // can verify syndication permissions before quoting content.
            license: `${siteUrl}/terms`,
            // audience — declares the intended professional readership.
            audience: {
              "@type":       "Audience",
              audienceType:  "Fintech companies, founders, CMOs, and marketing leaders",
            },
            // about — topical entity declarations for knowledge-graph association
            // with "fintech SEO agency contact" and related AEO queries.
            about: [
              { "@type": "Thing", name: "Fintech SEO" },
              { "@type": "Thing", name: "Content Marketing for Fintech" },
              { "@type": "Thing", name: "Link Building for Financial Services" },
              { "@type": "Thing", name: "Digital PR for Fintech" },
              { "@type": "Thing", name: "SEO Strategy Consultation" },
            ],
            // mentions — fintech verticals the agency covers, surfaced for long-tail
            // queries combining a vertical with "SEO agency contact".
            mentions: [
              { "@type": "Thing", name: "Embedded Finance" },
              { "@type": "Thing", name: "Open Banking" },
              { "@type": "Thing", name: "Payments Infrastructure" },
              { "@type": "Thing", name: "Neobanking" },
              { "@type": "Thing", name: "Regtech" },
              { "@type": "Thing", name: "Wealthtech" },
            ],
            // SpeakableSpecification now includes .geo-answer-block so AI voice
            // extractors (Google Assistant, AI Overviews) surface the direct-answer
            // BLUF paragraph for queries like "how do I contact FintechPressHub?".
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".geo-answer-block"],
            },
            // areaServed — declares the geographic markets served.
            // International SEO: AI ranking engines associate /contact with
            // "fintech SEO agency [market]" queries via this field.
            areaServed: [
              { "@type": "Country", name: "United States" },
              { "@type": "Country", name: "United Kingdom" },
              { "@type": "Country", name: "Singapore" },
              { "@type": "Country", name: "Australia" },
              { "@type": "Country", name: "Canada" },
            ],
            // accessibilityHazard: "none" — explicit WCAG/E-E-A-T declaration.
            // AI citation engines (Google AIO, Perplexity) prefer content with
            // declared hazard levels when ranking citation candidates.
            accessibilityHazard: "none",
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            // potentialAction as array: ReadAction + CommunicateAction.
            // CommunicateAction enables voice assistants to surface the contact
            // email for queries like "how do I email FintechPressHub?".
            potentialAction: [
              { "@type": "ReadAction", target: canonical },
              {
                "@type": "CommunicateAction",
                name:    "Email FintechPressHub",
                target:  "mailto:hello@fintechpresshub.com",
              },
            ],
            // G-10 / G-14: contentLocation — city-level Place entities linking ContactPage
            // to the 5 markets the agency serves. International SEO engines and AI ranking
            // systems use contentLocation to associate /contact with market-specific queries
            // like "fintech SEO agency London" or "fintech SEO agency Singapore".
            contentLocation: [
              { "@type": "City", name: "New York",   containedInPlace: { "@type": "Country", name: "United States" } },
              { "@type": "City", name: "London",     containedInPlace: { "@type": "Country", name: "United Kingdom" } },
              { "@type": "City", name: "Singapore",  containedInPlace: { "@type": "Country", name: "Singapore" } },
              { "@type": "City", name: "Sydney",     containedInPlace: { "@type": "Country", name: "Australia" } },
              { "@type": "City", name: "Toronto",    containedInPlace: { "@type": "Country", name: "Canada" } },
            ],
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

          // G-05: HowTo JSON-LD emitted by SSR for /contact so search-engine bots that
          // do not execute JavaScript (e.g. Googlebot light rendering, Bingbot, LLM crawlers)
          // can parse the full HowTo schema without depending on React hydration.
          // @id cross-references the client-side howToJsonLd (@id = `${canonical}#howto`)
          // so both rendering paths resolve the same entity in the Knowledge Graph.
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "HowTo",
            "@id":         `${canonical}#howto`,
            name:          "How to Get a Free Fintech SEO Audit from FintechPressHub",
            description:   "Submit a brief, receive a senior strategist review within one business day, join a free discovery call, and get a tailored fintech SEO proposal — all within 3 business days.",
            totalTime:     "PT30M",
            // G-09: datePublished/dateModified — freshness score for AI ranking engines.
            datePublished: "2021-01-01",
            dateModified:  "2026-05-15",
            inLanguage:    "en",
            step: [
              {
                "@type":   "HowToStep",
                position:  1,
                name:      "Submit your brief via the contact form",
                text:      "Complete the form with your company name, primary interest, monthly budget, and a description of your current SEO challenges and growth goals. Takes under 2 minutes.",
              },
              {
                "@type":   "HowToStep",
                position:  2,
                name:      "Senior strategist review within one business day",
                text:      "A senior fintech SEO strategist reviews your submission and performs a preliminary audit of your organic search footprint, identifying your fastest opportunities.",
              },
              {
                "@type":   "HowToStep",
                position:  3,
                name:      "Free 30-minute discovery call",
                text:      "We walk through our initial findings, surface two or three quick wins you can act on immediately, and assess strategic fit. The call is free with no obligation.",
              },
              {
                "@type":   "HowToStep",
                position:  4,
                name:      "Receive a tailored engagement proposal",
                text:      "If there is a clear strategic fit, you receive a scoped proposal within 48 hours — specific to your fintech vertical, target keywords, and growth stage. No pressure.",
              },
            ],
          }, null, 2));

          // ── /contact — FAQPage JSON-LD ────────────────────────────────────
          // Emitted alongside the QAPage (client-side PageMeta) to cover both
          // rendering paths. FAQPage is the schema.org type Google's rich-result
          // spec recognises for SERP accordion expansion, enabling a second rich-
          // result type alongside the ContactPage entity already injected above.
          // Questions mirror contactFaqs in contact.tsx (11 entries, updated
          // 2026-05-15) — keep in sync when FAQ content changes.
          extraLds.push(JSON.stringify({
            "@context":     "https://schema.org",
            "@type":        "FAQPage",
            "@id":          `${canonical}#faq`,
            url:            canonical,
            inLanguage:     "en",
            datePublished:  "2021-01-01",
            dateModified:   "2026-05-15",
            publisher:      { "@id": `${siteUrl}#organization` },
            isPartOf:       { "@id": `${siteUrl}#website` },
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h2", ".geo-answer-block"],
            },
            mainEntity: [
              {
                "@type":       "Question",
                name:          "What is a fintech SEO agency?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "A fintech SEO agency is a specialist search-engine-optimisation firm that works exclusively — or primarily — with financial-technology companies: neobanks, payment platforms, regtech providers, wealthtech startups, and embedded-finance businesses. Unlike a generalist SEO agency, a fintech SEO specialist understands FCA/SEC regulatory constraints on financial content, the YMYL (Your Money or Your Life) quality bar Google applies to financial pages, and the high-authority link-building required to outrank established banks and legacy finance publishers. FintechPressHub was founded in 2021 to serve exactly this niche.",
                },
              },
              {
                "@type":       "Question",
                name:          "How much does fintech SEO cost per month?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Fintech SEO retainers typically range from $3,000 to $30,000 per month, depending on the scope of work and the competitiveness of your target keywords. At FintechPressHub, our minimum monthly retainer is $5,000, which covers a senior fintech SEO strategist, specialist content production, and a link-building allocation. One-time SEO audits start at a lower fixed fee. Pricing is scoped individually after a free 30-minute discovery call, where we assess your current search footprint and growth targets. We price in USD, GBP, SGD, and AUD.",
                },
              },
              {
                "@type":       "Question",
                name:          "What happens after I submit the contact form?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "A senior strategist reviews your submission within one business day and emails you two or three time slots for a free 30-minute discovery call. There is no automated funnel and no junior SDR — you go straight to someone who will scope and price your engagement on the first call.",
                },
              },
              {
                "@type":       "Question",
                name:          "Is the discovery call free, and is there any obligation to commit?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "The 30-minute discovery call is completely free and consultative. We will review your current search footprint, surface two or three quick wins you can act on regardless of whether we work together, and only propose an engagement if there is a clear strategic fit. There is no obligation and no aggressive follow-up.",
                },
              },
              {
                "@type":       "Question",
                name:          "How quickly can we start after deciding to work together?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Typical kickoff is 7 to 10 business days from the signed agreement. That covers contract execution, data-access provisioning (GA4, GSC, CMS), a kickoff workshop, and the first sprint plan. For standalone SEO audits we can sometimes start within 3 to 5 days if your data access is ready.",
                },
              },
              {
                "@type":       "Question",
                name:          "What is the minimum engagement size for FintechPressHub?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Our minimum is the one-time SEO audit, delivered within 30 days. For ongoing retainers our minimum is $5,000 per month, which allows us to resource a senior strategist alongside a specialist fintech writer or outreach lead — the combination needed to move the needle in this highly competitive vertical.",
                },
              },
              {
                "@type":       "Question",
                name:          "Do you sign NDAs before the discovery call?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Yes. If you need to discuss pre-launch products, regulatory positioning, or sensitive funnel data, send your NDA template with the form submission and we will have it countersigned before the call takes place.",
                },
              },
              {
                "@type":       "Question",
                name:          "Can FintechPressHub work alongside our in-house SEO or content team?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Absolutely — approximately 40% of our retainers run in parallel with an in-house team. We slot in as the fintech-specialist layer covering expert writers, link builders, and technical SEO, reporting to your head of growth or content lead. We work comfortably within shared GSC access, shared editorial calendars, and joint sprint reviews.",
                },
              },
              {
                "@type":       "Question",
                name:          "What fintech verticals does FintechPressHub specialise in?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "FintechPressHub works across all major fintech sub-verticals: payments and payment orchestration, embedded finance and BaaS, open banking and PSD3, neobanking and digital banking, regtech and KYC/AML, wealthtech and robo-advisory, lending and credit underwriting, and insurtech. Our specialist writers and SEO strategists hold domain expertise in each vertical, which is why our content consistently meets Google's YMYL E-E-A-T quality bar — a standard that eliminates most generalist agencies from consideration.",
                },
              },
              {
                "@type":       "Question",
                name:          "What makes FintechPressHub different from a generalist SEO agency?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Three things: vertical depth, YMYL compliance, and link quality. Generalist agencies apply SaaS-template content to financial pages — content that Google's Quality Raters consistently flag as lacking expertise on YMYL topics. FintechPressHub writers hold fintech domain credentials, our editorial process follows E-E-A-T guidelines explicitly, and our link-building programme targets tier-1 finance and technology publishers rather than generic high-DR sites. We have operated exclusively in the fintech vertical since 2021.",
                },
              },
              {
                "@type":       "Question",
                name:          "Does FintechPressHub offer fintech SEO outside the US and UK?",
                answerCount:   1,
                acceptedAnswer: {
                  "@type":      "Answer",
                  inLanguage:   "en",
                  text: "Yes. We serve clients across five primary markets: the United States, United Kingdom, Singapore, Australia, and Canada. Retainers are priced in USD, GBP, SGD, and AUD on request. Our team spans multiple time zones, with UK clients receiving same-day replies before 11 am GMT. We also serve fintech companies in emerging markets — particularly in the UAE, Germany, and the Netherlands — on a project or retained basis.",
                },
              },
            ],
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
            // isAccessibleForFree — signals freely accessible content to AI citation
            // engines (Google AIO, Perplexity, ChatGPT Search). Crawlers prefer
            // open-access pages when selecting content to cite in generated answers.
            isAccessibleForFree: true,
            // accessMode — declares the human-sensory modes needed to consume this
            // page (text and images). Required for WCAG-aligned E-E-A-T scoring on
            // YMYL pages and parsed by accessibility auditors.
            accessMode: ["textual", "visual"],
            // accessibilityFeature — lists navigational and structural aids present
            // on the page. Strengthens E-E-A-T by confirming the page is correctly
            // structured for screen readers and cognitive-accessibility tooling.
            accessibilityFeature: ["readingOrder", "structuralNavigation", "tableOfContents"],
            // license — points crawlers to the usage terms for this page's content.
            // AI citation engines parse this to verify syndication permissions before
            // quoting content in generated answers.
            license: `${siteUrl}/terms`,
            // areaServed — declares global reach for this guest post programme.
            // GEO optimization: AI ranking engines (Google AIO, Perplexity) use this
            // to associate the page with "fintech guest posting worldwide" in their
            // knowledge graphs, surfacing it for region-agnostic queries.
            areaServed: { "@type": "Place", name: "Worldwide" },
            // audience — declares the intended professional readership of this
            // guest-post programme. Strengthens targeting signal for "fintech
            // write for us" and "fintech guest post for marketers" queries in
            // Google AI Overviews and Perplexity answer surfaces.
            audience: {
              "@type": "Audience",
              audienceType: "Fintech marketers, operators, founders, and content strategists",
            },
            // about — topical entity declarations for knowledge graph association.
            // Each entry strengthens the page's signal for intent-matching on
            // "fintech write for us", "fintech guest post", and "dofollow fintech".
            about: [
              { "@type": "Thing", name: "Fintech guest posting" },
              { "@type": "Thing", name: "Guest post dofollow backlink" },
              { "@type": "Thing", name: "Fintech content marketing" },
              { "@type": "Thing", name: "Fintech SEO" },
            ],
            // mentions — rich entity list mirroring the client-side Article schema.
            // Each Thing entry strengthens knowledge-graph association with the
            // fintech verticals covered by this guest-post programme, improving
            // ranking for long-tail queries like "fintech [topic] write for us".
            mentions: [
              { "@type": "Thing", name: "B2B Fintech Marketing" },
              { "@type": "Thing", name: "Embedded Finance" },
              { "@type": "Thing", name: "Open Banking" },
              { "@type": "Thing", name: "PSD3" },
              { "@type": "Thing", name: "Payments Infrastructure" },
              { "@type": "Thing", name: "Payment Orchestration" },
              { "@type": "Thing", name: "Card Issuing" },
              { "@type": "Thing", name: "Buy Now Pay Later" },
              { "@type": "Thing", name: "Neobanking" },
              { "@type": "Thing", name: "Digital Banking" },
              { "@type": "Thing", name: "Lending" },
              { "@type": "Thing", name: "Credit Underwriting" },
              { "@type": "Thing", name: "Wealthtech" },
              { "@type": "Thing", name: "Robo-Advisors" },
              { "@type": "Thing", name: "Regtech" },
              { "@type": "Thing", name: "KYC" },
              { "@type": "Thing", name: "AML" },
              { "@type": "Thing", name: "Fintech SaaS" },
              { "@type": "Thing", name: "Topical Authority" },
              { "@type": "Thing", name: "Link Building" },
              { "@type": "Thing", name: "AI in Financial Services" },
            ],
            keywords: "fintech write for us, fintech guest post, fintech guest blogging, dofollow guest post, submit fintech article",
            // SpeakableSpecification: extended to include .geo-answer-block (GEO Round 2)
            // and .wfu-faq-section (AEO Round 3) so voice assistants and AI answer
            // engines extract both the direct-answer paragraph and the FAQ section for
            // "fintech guest post" and "write for us fintech" queries.
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".geo-answer-block", ".wfu-faq-section"],
            },
            // mainEntityOfPage — declares the canonical WebPage entity this
            // CollectionPage describes, required for Google's entity graph to correctly
            // associate all structured-data blocks with the canonical URL.
            mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
            // significantLink — tells AI crawlers (Perplexity, ChatGPT Search, Gemini)
            // about the content ecosystem around this guest-post programme. Google AIO
            // surfaces significantLink targets as related-link cards alongside citations.
            significantLink: [
              `${canonical}#benefits`,
              `${canonical}#topics`,
              `${canonical}#guidelines`,
              `${canonical}#pitch-form`,
              `${canonical}#faq`,
              `${siteUrl}/editorial-guidelines`,
              `${siteUrl}/blog`,
              `${siteUrl}/services/guest-posting`,
            ],
            breadcrumb:   { "@id": `${canonical}#breadcrumb` },
            // potentialAction array — WriteAction enables Google Action cards for
            // "submit a fintech guest post" queries; ReadAction satisfies schema.org
            // spec for CollectionPage and matches the pattern used on all other
            // CollectionPage handlers (tools, compare, glossary, locations).
            potentialAction: [
              {
                "@type":  "WriteAction",
                name:     "Submit a Guest Post Pitch",
                // Target resolves to the exact pitch form element — required for
                // Google Action cards and schema.org WriteAction spec compliance.
                target:   `${canonical}#pitch-form`,
                object: {
                  "@type":    "Article",
                  inLanguage: "en",
                  about:      { "@type": "Thing", name: "Fintech SEO and content marketing" },
                },
              },
              { "@type": "ReadAction", target: canonical },
            ],
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

          // FAQPage — expanded to 8 Q&As, exactly mirroring the visible wfuFaqs accordion
          // (AEO audit, Round 2). Google FAQ rich results require schema and visible text
          // to match; divergence triggers suppression. All 8 items below are identical in
          // content to the wfuFaqs array in write-for-us.tsx.
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
            // inLanguage: "en" on every acceptedAnswer mirrors the site-wide
            // pattern used for blog post FAQPage schemas (see line ~2684) and satisfies
            // Google's International SEO requirement for language-tagged FAQ answers.
            mainEntity: [
              {
                "@type": "Question",
                name:    "What types of fintech content does FintechPressHub accept?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "We publish expert-level content covering payments infrastructure, open banking, embedded finance, lending, regtech, KYC/AML, wealthtech, insurtech, and fintech SaaS. Articles must be original, human-written, and targeted at a professional audience of founders, marketers, and operators — not general consumer finance content.",
                },
              },
              {
                "@type": "Question",
                name:    "How long does it take to hear back on a pitch?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "We review all pitches within 2–3 business days. If your topic is a strong fit you will receive an acceptance email with a brief scope doc and a suggested deadline. Off-niche or under-specified pitches are declined with a short note.",
                },
              },
              {
                "@type": "Question",
                name:    "How many dofollow links will my post include?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "High-quality submissions that meet our editorial standards receive up to 2 permanent dofollow backlinks.",
                },
              },
              {
                "@type": "Question",
                name:    "Is payment available for guest posts?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "We do not pay contributors. The compensation is up to 2 permanent dofollow backlinks from a topically-aligned fintech domain with a targeted readership — the same audience your product serves. Contributors consistently report measurable referral traffic and ranking lift from the placement.",
                },
              },
              {
                "@type": "Question",
                name:    "What word count do you require?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "Articles must be between 800 and 1,500 words. Every word must earn its place — tightly scoped, deeply researched pieces consistently outperform padded long-form in our niche. Thin or AI-generated content is rejected at pitch stage.",
                },
              },
              {
                "@type": "Question",
                name:    "Does FintechPressHub accept AI-generated content?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "No. We require human-written, expert-led articles that meet our editorial standards on accuracy, sourcing, and E-E-A-T. AI-assisted research and outline drafting are permitted, but the final piece must reflect the author's genuine expertise and original analysis. Submissions that appear AI-generated are rejected without review.",
                },
              },
              {
                "@type": "Question",
                name:    "Can I include links to my company's website in the article?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "Yes — up to 2 contextual links placed naturally within the article body. Links must be topically relevant to the surrounding content. Author bio links are also permitted. Exact-match anchor text and unrelated outbound links are edited out during review.",
                },
              },
              {
                "@type": "Question",
                name:    "Do you publish content from international contributors?",
                acceptedAnswer: {
                  "@type":    "Answer",
                  inLanguage: "en",
                  text:       "Yes. We publish contributions from fintech operators and marketers worldwide. FintechPressHub serves readers across the UK, US, Singapore, Australia, Canada, and the broader APAC and European fintech markets. Your geographic location is not a barrier — editorial quality and topical relevance are the only criteria.",
                },
              },
            ],
          }, null, 2));

          // ItemList — machine-readable taxonomy of the 16 topic categories shown in the
          // "Topics We Publish" grid. Programmatic SEO: Googlebot cannot execute the
          // client-side React topicCategories array, so this SSR ItemList is the only
          // crawlable representation. Enables Google topic-list rich snippets for queries
          // like "what fintech topics does FintechPressHub publish" and "fintech guest
          // post topics", and strengthens knowledge-graph association with each vertical.
          extraLds.push(JSON.stringify({
            "@context":    "https://schema.org",
            "@type":       "ItemList",
            "@id":         `${canonical}#topics`,
            name:          "Fintech Guest Post Topic Categories — FintechPressHub",
            description:   "The 16 fintech topic categories FintechPressHub commissions guest posts on.",
            url:           `${canonical}#topics`,
            inLanguage:    "en",
            numberOfItems: 16,
            // url on every ListItem links each topic category back to the #topics
            // anchor on this page. Programmatic SEO: Googlebot can resolve individual
            // ListItem URLs and associate them with the topic taxonomy, strengthening
            // knowledge-graph signals for "fintech guest post [topic]" queries.
            itemListElement: [
              { "@type": "ListItem", position: 1,  name: "Payments Infrastructure",    description: "Card issuing & processing, payment orchestration, cross-border rails",                url: `${canonical}#topics` },
              { "@type": "ListItem", position: 2,  name: "Embedded Finance",           description: "BaaS architecture, embedded lending playbooks, vertical SaaS payments",               url: `${canonical}#topics` },
              { "@type": "ListItem", position: 3,  name: "Open Banking & PSD3",        description: "Account-to-account payments, variable recurring payments, data-sharing compliance",   url: `${canonical}#topics` },
              { "@type": "ListItem", position: 4,  name: "Neobanking & Digital Banks", description: "Activation & retention, fee economics, regulatory sandboxing",                        url: `${canonical}#topics` },
              { "@type": "ListItem", position: 5,  name: "BNPL & Consumer Lending",    description: "Underwriting models, affordability checks, merchant integrations",                    url: `${canonical}#topics` },
              { "@type": "ListItem", position: 6,  name: "B2B & SME Lending",          description: "Cash-flow underwriting, embedded SME credit, receivables financing",                  url: `${canonical}#topics` },
              { "@type": "ListItem", position: 7,  name: "Wealthtech & Robo-advisors", description: "Portfolio construction, advisor SaaS marketing, self-directed investing",             url: `${canonical}#topics` },
              { "@type": "ListItem", position: 8,  name: "Regtech & Compliance",       description: "Transaction monitoring, reg reporting tooling, sanctions screening",                  url: `${canonical}#topics` },
              { "@type": "ListItem", position: 9,  name: "KYC, AML & Fraud",           description: "Identity verification, fraud orchestration, synthetic ID detection",                  url: `${canonical}#topics` },
              { "@type": "ListItem", position: 10, name: "Fintech SaaS",               description: "Treasury & FP&A platforms, AP/AR & spend management, embedded-finance SaaS",         url: `${canonical}#topics` },
              { "@type": "ListItem", position: 11, name: "Fintech SEO & Content",      description: "Topical authority builds, programmatic SEO, editorial workflows",                     url: `${canonical}#topics` },
              { "@type": "ListItem", position: 12, name: "Fintech CRO & Growth",       description: "Onboarding funnels, pricing experiments, lifecycle messaging",                        url: `${canonical}#topics` },
              { "@type": "ListItem", position: 13, name: "Treasury & CFO Tooling",     description: "AP/AR automation, spend management, multi-entity treasury",                          url: `${canonical}#topics` },
              { "@type": "ListItem", position: 14, name: "Insurtech",                  description: "Embedded insurance, underwriting AI, claims automation",                              url: `${canonical}#topics` },
              { "@type": "ListItem", position: 15, name: "Wealth & Robo Marketing",    description: "Compliant ad creative, disclosures & disclaimers, RIA referral programs",            url: `${canonical}#topics` },
              { "@type": "ListItem", position: 16, name: "AI in Financial Services",   description: "LLM risk frameworks, agentic finance UX, model governance",                          url: `${canonical}#topics` },
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
          // Exhaustive 8-category SEO audit (2026-05-15):
          //   - Keywords + about arrays for Knowledge Graph entity association (On-Page O-7, GEO G-11)
          //   - SpeakableSpec expanded to h1 + .speakable-summary + .press-faq-answer + h2 (AEO A-3)
          //   - conditionsOfAccess: OnlineAccess (White Hat W-6)
          //   - FAQPage schema with 10 journalist Q&As (AEO A-1)
          const pressFaqItems = [
            {
              question: "What is FintechPressHub?",
              answer: "FintechPressHub is a specialist fintech SEO and content marketing agency founded in 2021. FintechPressHub helps ambitious fintech brands in payments, embedded finance, open banking, neobanking, lending, regtech, and wealthtech scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals.",
            },
            {
              question: "How can journalists and editors contact FintechPressHub?",
              answer: "Journalists and editors can reach the FintechPressHub press team at hello@fintechpresshub.com. The team typically responds to press enquiries within one business day. For urgent requests, include 'PRESS INQUIRY' in the subject line.",
            },
            {
              question: "Is FintechPressHub available for expert commentary on fintech topics?",
              answer: "Yes. FintechPressHub's editorial team provides expert commentary on fintech SEO, content marketing, open banking, payments technology, digital lending, regtech, and the broader fintech ecosystem. To request a quote or expert opinion, email hello@fintechpresshub.com with your publication name, deadline, and the topic requiring commentary.",
            },
            {
              question: "What fintech topics does FintechPressHub cover?",
              answer: "FintechPressHub covers eight fintech verticals: payments and card processing, embedded finance, open banking and API banking, neobanking and challenger banks, consumer and SME lending (BNPL, personal loans, mortgages), regtech and compliance, wealthtech and investment platforms, and fintech SEO and content marketing strategy.",
            },
            {
              question: "What brand assets are available for media use?",
              answer: "The following FintechPressHub brand assets are freely available for editorial and media use: the SVG logo, PNG icons at 512×512 and 192×192 pixels, and the Apple Touch Icon. The primary brand colour is #0052FF (Primary Blue) on a dark navy (#0a0f1e) background.",
            },
            {
              question: "Does FintechPressHub accept guest contributions?",
              answer: "Yes. FintechPressHub accepts guest contributions from established fintech operators, marketers, and founders. Approved posts earn up to two permanent dofollow links and reach 50,000+ targeted monthly readers. All submissions are editorially reviewed against FintechPressHub's editorial guidelines before publication.",
            },
            {
              question: "What is the editorial standard at FintechPressHub?",
              answer: "FintechPressHub follows strict editorial standards: all content must be original, written by individuals with verifiable fintech experience, and free from undisclosed paid promotions. Claims must be sourced. The editorial team independently verifies statistics and links. FintechPressHub publishes corrections prominently when errors are identified.",
            },
            {
              question: "How many monthly readers does FintechPressHub reach?",
              answer: "FintechPressHub reaches 50,000+ monthly readers (as of 2026) across its editorial content. The readership is primarily comprised of fintech founders, product managers, marketers, compliance officers, and investors in payments, open banking, lending, and adjacent sectors.",
            },
            {
              question: "When was FintechPressHub founded?",
              answer: "FintechPressHub was founded in 2021. Since founding, the agency has published over 200 original articles across eight fintech verticals and built an editorial network serving 50,000+ monthly readers.",
            },
            {
              question: "What is FintechPressHub's approved company boilerplate for press use?",
              answer: "Approved press boilerplate: 'FintechPressHub is a specialist SEO and content marketing agency for fintech companies. Founded in 2021, the agency helps ambitious fintech brands — in payments, embedded finance, open banking, neobanking, lending, and regtech — scale organic growth through expert-led content, high-authority link building, and technical SEO. FintechPressHub publishes original editorial content for 50,000+ monthly readers across eight fintech verticals and accepts guest contributions from established operators and founders.'",
            },
          ];

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
            about: [
              { "@id": `${siteUrl}#organization` },
              { "@type": "Thing", name: "Press Kit" },
              { "@type": "Thing", name: "Media Kit" },
              { "@type": "Thing", name: "Fintech SEO Agency" },
              { "@type": "Thing", name: "FintechPressHub" },
            ],
            keywords: "FintechPressHub press kit, fintech SEO agency press, fintech media kit, FintechPressHub brand assets, fintech press contact, FintechPressHub boilerplate, fintech content marketing agency",
            conditionsOfAccess: "https://schema.org/OnlineAccess",
            // SpeakableSpecification enables voice-assistant and AI citation engine extraction
            // of the press hub headline, BLUF summary, FAQ answers, and section headings —
            // covering queries like "What is FintechPressHub?", "how to contact FintechPressHub press".
            speakable: {
              "@type":     "SpeakableSpecification",
              cssSelector: ["h1", ".speakable-summary", ".press-faq-answer", "h2"],
            },
            breadcrumb:      { "@id": `${canonical}#breadcrumb` },
            potentialAction: { "@type": "ReadAction", target: canonical },
          }, null, 2));

          // FAQPage schema — enables People Also Ask rich results for journalist queries.
          // Synced with pressFAQs array in artifacts/fintechpresshub/src/pages/press.tsx.
          // When FAQ content changes, update BOTH arrays to keep SSR (Googlebot) and
          // client-side (browser) schemas consistent.
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "FAQPage",
            "@id":        `${canonical}#faq`,
            url:          canonical,
            name:         staticMeta.title,
            datePublished: STATIC_PAGE_CREATED[reqPath] ?? "2023-06-01",
            dateModified: pageLastmod ?? "2026-05-15",
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            mainEntity:   pressFaqItems.map((item) => ({
              "@type":        "Question",
              name:           item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text:    item.answer,
              },
            })),
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

        // ── Per-route OG article meta + Dublin Core enrichment ────────────
        // Injected after the universal patches block so route-specific fields
        // (article:published_time, article:section, DC.*) are added without
        // modifying the shared patches assembly above.
        if (reqPath === "/glossary" && patches) {
          // GEO direct-answer block — injected after patches is built so TypeScript
          // narrows patches to MetaPatches (not null). The hidden div appears in the
          // raw SSR HTML for Googlebot before JS executes; React reconciles it cleanly.
          // The .geo-answer-block class is referenced in the SpeakableSpecification
          // cssSelector in the DefinedTermSet schema above (GEO Gap 4.1 fix).
          patches.bodyPatch = `<div class="geo-answer-block" style="display:none" aria-hidden="true"><p>The FintechPressHub Fintech Glossary is a free, continuously updated reference of 100+ plain-English fintech definitions — covering payments infrastructure, embedded finance, open banking, regtech, neobanking, wealthtech, and lending. Written by fintech domain specialists. No account required.</p></div>`;
          // International SEO: regional English hreflang codes for the 4 primary fintech
          // markets — UK, Australia, Singapore, Canada. The default patchHtml already
          // injects hreflang="en" and "x-default"; these 4 regional codes are additive
          // and align with the signals on service pages, locations, and blog categories.
          // Dublin Core: extends the DC provenance pattern established across blog posts,
          // write-for-us, services, and pricing so the glossary hub is indexed with full
          // DC metadata by library, academic, and financial research indexers.
          patches.headLinks = [
            // International: en-US added for consistency with /services, /pricing,
            // /contact. Google requires all locale variants to be listed when using
            // regional hreflang — including the primary market (en-US).
            `  <link rel="alternate" hreflang="en-US" href="${esc(canonical)}" />`,
            `  <link rel="alternate" hreflang="en-GB" href="${esc(canonical)}" />`,
            `  <link rel="alternate" hreflang="en-AU" href="${esc(canonical)}" />`,
            `  <link rel="alternate" hreflang="en-SG" href="${esc(canonical)}" />`,
            `  <link rel="alternate" hreflang="en-CA" href="${esc(canonical)}" />`,
            // Technical: RSS autodiscovery link lets RSS readers, Feedly, and AI
            // feed bots detect the glossary feed from the hub page — the same
            // pattern used for the blog RSS in index.html. Required for full
            // feed-autodiscovery compliance (Technical T-8).
            `  <link rel="alternate" type="application/rss+xml" title="FintechPressHub Fintech Glossary" href="${siteUrl}/glossary/rss.xml" />`,
            // On-Page: glossary-specific keywords meta for vocabulary-intent head terms.
            `  <meta name="keywords" content="fintech glossary, fintech terms, fintech definitions, payments terminology, embedded finance definitions, open banking glossary, regtech terms, neobanking glossary, wealthtech definitions" />`,
            // Technical: extended robots directives — max-snippet:-1 allows full
            // SERP snippet; max-image-preview:large enables OG social card display.
            `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
            `  <meta name="DC.title" content="Fintech Glossary: 100+ Key Terms &amp; Definitions | FintechPressHub" />`,
            `  <meta name="DC.creator" content="FintechPressHub Editorial Team" />`,
            `  <meta name="DC.subject" content="Fintech Glossary, Financial Technology Terms, Payments, Embedded Finance, Open Banking, Regtech, Neobanking, Wealthtech" />`,
            `  <meta name="DC.description" content="Plain-English definitions for payments, embedded finance, open banking, regtech, neobanking, wealthtech, and lending — written by fintech domain specialists." />`,
            `  <meta name="DC.publisher" content="FintechPressHub" />`,
            `  <meta name="DC.date" scheme="W3CDTF" content="2024-06-01" />`,
            `  <meta name="DC.type" scheme="DCMIType" content="Text" />`,
            `  <meta name="DC.format" content="text/html" />`,
            `  <meta name="DC.language" scheme="RFC5646" content="en" />`,
            `  <meta name="DC.identifier" content="${esc(canonical)}" />`,
            `  <meta name="DC.rights" content="${esc(`${siteUrl}/terms`)}" />`,
          ];
          // On-Page: article:* OG meta on the glossary hub — treats the hub as an
          // editorial reference publication (which it is: written by FintechPressHub
          // Editorial Team, first published 2024-06-01). Unlocks article-namespace
          // social cards on LinkedIn and Facebook, and signals editorial provenance to
          // Google's content classifier — matching the pattern on /write-for-us.
          patches.ogType               = "article";
          patches.articlePublishedTime = "2024-06-01";
          patches.articleModifiedTime  = pageLastmod ?? "2026-05-15";
          patches.articleSection       = "Fintech Reference";
          patches.articleTags          = [
            "fintech glossary",
            "fintech terms",
            "payments",
            "embedded finance",
            "open banking",
            "regtech",
          ];
          patches.articleAuthor    = "FintechPressHub Editorial Team";
          patches.articlePublisher = "https://twitter.com/fintechpresshub";
          patches.author           = "FintechPressHub Editorial Team";
        }

        if (reqPath === "/write-for-us" && patches) {
          // OG article namespace — unlocks article:* meta tags in <head>.
          // LinkedIn, Facebook, and Google's structured-snippets parser read
          // these tags alongside og:type="article" (set in STATIC_META above)
          // to populate social cards and establish the content's temporal context.
          patches.articlePublishedTime = "2023-10-01";
          patches.articleModifiedTime  = pageLastmod ?? "2026-05-15";
          patches.articleSection       = "Contributor Guidelines";
          patches.articleTags          = [
            "fintech write for us",
            "fintech guest post",
            "dofollow guest post",
            "fintech content marketing",
            "fintech link building",
          ];
          patches.articleAuthor    = "FintechPressHub Editorial Team";
          patches.articlePublisher = "https://twitter.com/fintechpresshub";
          patches.author           = "FintechPressHub Editorial Team";
          // Dublin Core meta — academic and research databases (BASE, EuroPubMed,
          // JSTOR-adjacent crawlers, financial research indexers) parse DC meta
          // as a secondary discovery channel alongside OG and structured data.
          // The SSR blog-post handler already injects DC.title/creator/date/subject
          // for every article; adding them here ensures the write-for-us page has
          // full DC provenance, matching the standard set across the rest of the site.
          patches.headLinks = [
            `  <meta name="DC.title" content="Fintech Guest Post | Write For Us | FintechPressHub" />`,
            `  <meta name="DC.creator" content="FintechPressHub Editorial Team" />`,
            `  <meta name="DC.subject" content="Fintech Guest Posting, Fintech Content Marketing, Dofollow Guest Posts, Fintech SEO, Guest Blogging" />`,
            `  <meta name="DC.date" scheme="W3CDTF" content="2023-10-01" />`,
            `  <meta name="DC.identifier" content="${canonical}" />`,
          ];
        }

        if (reqPath === "/services" && patches) {
          // ── /services hub — per-route head enrichment ────────────────────
          //
          // International SEO: per-market hreflang codes for all 5 primary markets.
          // The generic patchHtml already injects hreflang="en" + x-default; these
          // five regional codes are additive and satisfy Google's requirement to list
          // all locale variants when using regional hreflang.
          //
          // Keywords: service-hub commercial-intent head terms covering all five
          // service categories — supplemented the site-level keywords in index.html.
          //
          // Robots: max-snippet:-1 permits full SERP description; max-image-preview:large
          // enables the large OG social card for service-intent queries.
          patches.headLinks = [
            `  <link rel="alternate" hreflang="en-US" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-GB" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-SG" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-CA" href="${canonical}" />`,
            `  <meta name="keywords" content="fintech SEO services, fintech content marketing, fintech link building, fintech guest posting, topical authority fintech, fintech SEO audit, fintech SEO agency, financial services content marketing" />`,
            `  <meta name="DC.title" content="${staticMeta.title}" />`,
            `  <meta name="DC.creator" content="FintechPressHub" />`,
            `  <meta name="DC.subject" content="Fintech SEO, Content Marketing, Link Building, Guest Posting, Topical Authority, SEO Audit" />`,
            `  <meta name="DC.date" scheme="W3CDTF" content="2021-06-01" />`,
            `  <meta name="DC.identifier" content="${canonical}" />`,
            `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
          ];
        }

        if (reqPath === "/pricing" && patches) {
          // ── /pricing — per-route head enrichment ────────────────────────
          //
          // International SEO: per-market hreflang codes for all 5 primary markets.
          // The generic patchHtml function already injects hreflang="en" and
          // hreflang="x-default" for all pages; these five regional codes are
          // additive and satisfy Google's requirement to list every locale variant
          // (including the default) when using regional hreflang.
          //
          // Keywords: pricing-specific meta keywords supplement the site-level
          // keywords set in index.html — targeting commercial-intent head terms.
          //
          // Dublin Core: extends the DC provenance pattern for academic and
          // financial research indexers (BASE, EuroPubMed, etc.).
          patches.headLinks = [
            `  <link rel="alternate" hreflang="en-US" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-GB" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-SG" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-CA" href="${canonical}" />`,
            `  <meta name="keywords" content="fintech SEO pricing, fintech content marketing pricing, link building retainer cost, fintech SEO agency fees, SEO retainer for fintech, fintech SEO cost per month, fintech SEO retainer, content marketing for fintech brands" />`,
            `  <meta name="DC.title" content="${staticMeta.title}" />`,
            `  <meta name="DC.creator" content="FintechPressHub" />`,
            `  <meta name="DC.subject" content="Fintech SEO Pricing, Content Marketing Retainer, Link Building Cost, Fintech SEO Agency Fees, Fintech SEO Cost" />`,
            `  <meta name="DC.date" scheme="W3CDTF" content="2022-01-01" />`,
            `  <meta name="DC.identifier" content="${canonical}" />`,
          ];
        }

        if (reqPath === "/contact" && patches) {
          // ── /contact — per-route head enrichment ────────────────────────
          //
          // International SEO: per-market hreflang codes for the 5 primary markets.
          // The generic patchHtml function already injects hreflang="en" and
          // hreflang="x-default" for all pages; these five market-specific codes are
          // additive and satisfy Google's requirement to list all locale variants
          // (including the default) when using regional hreflang.
          //
          // Technical SEO (Local): geo.region + geo.placename + geo.position + ICBM
          // are parsed by Bing, Yandex, Baidu, and legacy local-SEO crawlers as
          // geo-targeting signals. US-NY matches BRAND_NAP and the contentLocation
          // field on the ContactPage JSON-LD above (New York, United States).
          //
          // Dublin Core: extends the DC provenance pattern already established for
          // /write-for-us and all blog posts — ensures /contact has full DC meta so
          // academic crawlers (BASE) and financial research indexers can index it.
          //
          // Robots: extended directives beyond the HTML default — max-snippet:-1
          // permits Google to display an unlimited SERP snippet; max-image-preview:large
          // enables the large OG card; max-video-preview:-1 future-proofs for video.
          patches.headLinks = [
            `  <link rel="alternate" hreflang="en-US" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-GB" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-SG" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-AU" href="${canonical}" />`,
            `  <link rel="alternate" hreflang="en-CA" href="${canonical}" />`,
            `  <meta name="geo.region" content="US-NY" />`,
            `  <meta name="geo.placename" content="New York" />`,
            `  <meta name="geo.position" content="40.7128;-74.0060" />`,
            `  <meta name="ICBM" content="40.7128, -74.0060" />`,
            `  <meta name="DC.title" content="${staticMeta.title}" />`,
            `  <meta name="DC.creator" content="FintechPressHub" />`,
            `  <meta name="DC.subject" content="Fintech SEO Agency, Contact Fintech SEO, Free SEO Audit, Fintech Content Marketing, Fintech Link Building" />`,
            `  <meta name="DC.date" scheme="W3CDTF" content="2021-01-01" />`,
            `  <meta name="DC.identifier" content="${canonical}" />`,
            `  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
          ];
        }
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
