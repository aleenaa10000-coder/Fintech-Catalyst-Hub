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
  pricingPlansTable,
} from "@workspace/db";
import { eq, lte, sql, desc, asc } from "drizzle-orm";
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
  /** OG article:published_time (blog posts — ISO 8601). */
  articlePublishedTime?: string;
  /** OG article:modified_time (blog posts — ISO 8601). */
  articleModifiedTime?: string;
  /** OG article:author meta tag value (blog posts — author display name). */
  articleAuthor?: string;
  /** twitter:creator tag (blog posts — author's Twitter @handle). */
  twitterCreator?: string;
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

  if (p.articlePublishedTime) {
    injections.push(`  <meta property="article:published_time" content="${esc(p.articlePublishedTime)}" />`);
  }

  if (p.articleModifiedTime) {
    injections.push(`  <meta property="article:modified_time" content="${esc(p.articleModifiedTime)}" />`);
  }

  if (p.articleAuthor) {
    injections.push(`  <meta property="article:author" content="${esc(p.articleAuthor)}" />`);
  }

  if (p.twitterCreator) {
    injections.push(`  <meta name="twitter:creator" content="${esc(p.twitterCreator)}" />`);
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
  authors: "Authors",
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
  "/":                                "2026-05-10",
  "/about":                           "2026-05-09",
  "/services":                        "2026-05-09",
  "/pricing":                         "2026-05-09",
  "/authors":                         "2026-05-09",
  "/write-for-us":                    "2026-04-25",
  "/editorial-guidelines":            "2026-04-28",
  "/community-guidelines":            "2026-04-28",
  "/tools":                           "2026-05-09",
  "/tools/financial-health-score-calculator": "2026-04-25",
  "/tools/meta-description-generator":        "2026-04-25",
  "/tools/guest-post-pitch-generator":        "2026-04-25",
  "/tools/readability-checker":               "2026-04-25",
  "/tools/keyword-difficulty-estimator":      "2026-04-25",
  "/tools/backlink-value-estimator":          "2026-04-25",
  "/tools/content-brief-generator":           "2026-04-25",
  "/tools/headline-analyzer":                 "2026-04-25",
  "/tools/link-prospector":                   "2026-05-09",
  "/tools/outreach-email-generator":          "2026-05-09",
  "/glossary":                        "2026-05-09",
  "/resources/fintech-publications":  "2026-05-09",
  "/press":                           "2026-05-09",
  "/contact":                         "2026-04-25",
  "/privacy-policy":                  "2026-04-28",
  "/refund-policy":                   "2026-04-28",
  "/cookie-policy":                   "2026-04-28",
  "/terms":                           "2026-04-28",
  "/compare":                         "2026-05-09",
  "/compare/agency-vs-in-house":      "2026-05-09",
  "/compare/vs-freelancers":          "2026-05-09",
  "/compare/vs-seo-tools":            "2026-05-09",
  "/compare/vs-pr-agencies":          "2026-05-09",
  "/compare/content-led-vs-paid":     "2026-05-09",
  "/compare/specialist-vs-generalist": "2026-05-09",
  "/locations":                        "2026-05-10",
};

/**
 * Per-page OG image parameters for static pages.
 * Every static page previously received the same generic opengraph.jpg, meaning
 * all 19 static routes looked identical in social shares and carried no image
 * diversity signal for crawlers. Each page now gets a unique, branded OG card
 * via /api/og with a page-specific title and category pill.
 */
const STATIC_OG_META: Readonly<Record<string, { category: string; ogTitle: string }>> = {
  "/":                                { category: "Agency",      ogTitle: "Fintech SEO & Content Marketing Agency" },
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
    steps: [
      { name: "Enter your income and debt", text: "Input your gross monthly income and total monthly debt payments to calculate your debt-to-income ratio." },
      { name: "Add your savings data",      text: "Enter your monthly savings amount and total savings balance so the calculator can assess your savings rate and emergency fund coverage." },
      { name: "Submit your figures",        text: "Click 'Calculate Score' to generate your personalised 0–100 Financial Health Score across four key dimensions." },
      { name: "Review your results",        text: "Read your score breakdown and tailored recommendations to improve your financial health over the next 90 days." },
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
          faqItems:             blogPostsTable.faqItems,
          blufSummary:          blogPostsTable.blufSummary,
          aboutEntities:        blogPostsTable.aboutEntities,
          mentionEntities:      blogPostsTable.mentionEntities,
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
      const dateModified = (post.lastMaterialUpdateAt ?? post.updatedAt ?? post.publishedAt).toISOString();
      const authorSlug   = post.author ? toAuthorSlug(post.author) : null;
      const authorUrl    = authorSlug ? `${siteUrl}/authors/${authorSlug}` : null;
      const tags         = Array.isArray(post.tags) ? (post.tags as string[]) : [];

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", slug], pageTitle);

      const aboutEntities   = Array.isArray(post.aboutEntities)   ? (post.aboutEntities   as string[]) : [];
      const mentionEntities = Array.isArray(post.mentionEntities) ? (post.mentionEntities as string[]) : [];
      const faqItems        = Array.isArray(post.faqItems)        ? (post.faqItems as Array<{ question: string; answer: string }>) : [];

      // Look up author Twitter handle for twitter:creator tag (E-E-A-T signal).
      let authorTwitter: string | null = null;
      if (authorSlug) {
        const [authorRow] = await db
          .select({ social: authorsTable.social })
          .from(authorsTable)
          .where(eq(authorsTable.slug, authorSlug))
          .limit(1);
        const social = (authorRow?.social ?? {}) as { twitter?: string };
        authorTwitter = social.twitter ?? null;
      }

      const extraLds: string[] = [
        JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "BlogPosting",
          "@id":      canonical,
          headline:   post.title,
          description,
          url:        canonical,
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          image: ogImage.includes("/api/og")
            ? { "@type": "ImageObject", url: ogImage, width: 1200, height: 630 }
            : { "@type": "ImageObject", url: ogImage },
          inLanguage: "en",
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
          ...(aboutEntities.length > 0
            ? { about: aboutEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          ...(mentionEntities.length > 0
            ? { mentions: mentionEntities.map((e) => ({ "@type": "Thing", name: e })) }
            : {}),
          ...(post.blufSummary ? { abstract: post.blufSummary.slice(0, 500) } : {}),
          potentialAction: { "@type": "ReadAction", target: canonical },
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (faqItems.length > 0) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "FAQPage",
          "@id":      `${canonical}#faq`,
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name:    item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }, null, 2));
      }

      if (post.blufSummary) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "WebPage",
          "@id":      `${canonical}#webpage`,
          url:        canonical,
          speakable: {
            "@type":     "SpeakableSpecification",
            cssSelector: [".bluf-summary"],
          },
          abstract:   post.blufSummary.slice(0, 500),
        }, null, 2));
      }

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
        twitterCreator:       authorTwitter ?? undefined,
        extraLds,
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
      const ogImage       = `${siteUrl}/api/og?title=${encodeURIComponent(loc.headline)}&category=Location`;

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
            "@type":         ["LocalBusiness", "ProfessionalService"],
            "@id":           canonical,
            name:            `FintechPressHub — ${loc.city} Fintech SEO`,
            description:     loc.headline,
            serviceType:     "Fintech SEO & Content Marketing",
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
          JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "FAQPage",
            "@id":      `${canonical}#faq`,
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
          term:        glossaryTermsTable.term,
          shortDef:    glossaryTermsTable.shortDef,
          category:    glossaryTermsTable.category,
          publishedAt: glossaryTermsTable.publishedAt,
          updatedAt:   glossaryTermsTable.updatedAt,
        })
        .from(glossaryTermsTable)
        .where(eq(glossaryTermsTable.slug, slug))
        .limit(1);

      if (!term) return next();

      const canonical   = `${siteUrl}/glossary/${slug}`;
      const description = term.shortDef.slice(0, 160);
      const title       = `${term.term} — Fintech Glossary | FintechPressHub`;
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(term.term)}&category=Glossary`;

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
              name:    "Fintech Glossary",
              url:     `${siteUrl}/glossary`,
            },
            ...(term.category ? { subjectOf: { "@type": "Thing", name: term.category } } : {}),
          }, null, 2),
          JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "FAQPage",
            "@id":      `${canonical}#faq`,
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

      if (!svc) return next();

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
            inLanguage:   "en",
            areaServed:   "Worldwide",
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
          name:            authorsTable.name,
          role:            authorsTable.role,
          shortBio:        authorsTable.shortBio,
          photo:           authorsTable.photo,
          social:          authorsTable.social,
          expertise:       authorsTable.expertise,
          credentials:     authorsTable.credentials,
          location:        authorsTable.location,
          yearsExperience: authorsTable.yearsExperience,
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
        extraLds: [
          JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ProfilePage",
            "@id":      canonical,
            url:        canonical,
            inLanguage: "en",
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
      const ogImage     = `${siteUrl}/api/og?title=${encodeURIComponent(catMeta.title.replace(" | FintechPressHub", ""))}&category=${encodeURIComponent(slug)}`;
      const leafLabel   = catMeta.title.replace(" | FintechPressHub", "");

      const breadcrumbs = buildCrumbsForPath(siteUrl, ["blog", "category", slug], leafLabel);

      // Fetch posts in this category for ItemList schema.
      const catPosts = await db
        .select({ slug: blogPostsTable.slug, title: blogPostsTable.title, category: blogPostsTable.category, noIndex: blogPostsTable.noIndex })
        .from(blogPostsTable)
        .where(lte(blogPostsTable.publishedAt, sql`now()`))
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(20);
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
          isPartOf:     { "@id": `${siteUrl}/blog` },
          publisher:    { "@id": `${siteUrl}#organization` },
          dateModified: new Date().toISOString().slice(0, 10),
        }, null, 2),
        buildBreadcrumbLd(breadcrumbs),
      ];

      if (filteredCatPosts.length > 0) {
        extraLds.push(JSON.stringify({
          "@context": "https://schema.org",
          "@type":    "ItemList",
          name:       catMeta.title,
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
            "@context": "https://schema.org",
            "@type":    "FAQPage",
            "@id":      canonical,
            name:       cmpMeta.title,
            url:        canonical,
            publisher:  { "@id": `${siteUrl}#organization` },
            ...(STATIC_PAGE_LASTMOD[`/compare/${slug}`] ? { dateModified: STATIC_PAGE_LASTMOD[`/compare/${slug}`] } : {}),
            mainEntity: faqMainEntity,
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

      const toolExtraLds: string[] = [
        JSON.stringify({
          "@context":           "https://schema.org",
          "@type":              "SoftwareApplication",
          "@id":                canonical,
          name:                 leafLabel,
          description:          toolMeta.description,
          url:                  canonical,
          applicationCategory:  "WebApplication",
          operatingSystem:      "Web",
          isAccessibleForFree:  true,
          offers: {
            "@type":        "Offer",
            price:          "0",
            priceCurrency:  "USD",
          },
          provider: { "@id": `${siteUrl}#organization` },
          ...(STATIC_PAGE_LASTMOD[`/tools/${slug}`] ? { dateModified: STATIC_PAGE_LASTMOD[`/tools/${slug}`] } : {}),
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
          tool: { "@type": "HowToTool", name: leafLabel },
          step: howTo.steps.map((s, i) => ({
            "@type":   "HowToStep",
            position:  i + 1,
            name:      s.name,
            text:      s.text,
          })),
        }, null, 2));
      }
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
            name:         staticMeta.title,
            description:  staticMeta.description,
            dateModified: pageLastmod ?? "2026-05-09",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
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
            .limit(10);
          const visibleHubPosts = hubPosts.filter((p) => !p.noIndex);
          extraLds.push(JSON.stringify({
            "@context":  "https://schema.org",
            "@type":     "CollectionPage",
            "@id":       canonical,
            url:         canonical,
            name:        staticMeta.title,
            description: staticMeta.description,
            dateModified: (visibleHubPosts[0]?.publishedAt ?? new Date()).toISOString().slice(0, 10),
            inLanguage:  "en",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
          }, null, 2));
          if (visibleHubPosts.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Latest Fintech Articles",
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
            dateModified: pageLastmod ?? "2026-05-09",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
          }, null, 2));
          if (hubAuthors.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Our Contributors & Expert Authors",
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
            dateModified: pageLastmod ?? "2026-05-09",
            isPartOf:    { "@id": `${siteUrl}#website` },
            publisher:   { "@id": `${siteUrl}#organization` },
          }, null, 2));
          if (hubServices.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech Content Marketing Services",
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
            name:         staticMeta.title,
            description:  staticMeta.description,
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          if (pricingList.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO Pricing Plans",
              url:        canonical,
              itemListElement: pricingList.map((plan, i) => ({
                "@type":    "ListItem",
                position:   i + 1,
                name:       plan.tagline ? `${plan.name} — ${plan.tagline}` : plan.name,
                url:        `${canonical}#${plan.name.toLowerCase().replace(/\s+/g, "-")}`,
                item: {
                  "@type":       "Offer",
                  name:          plan.name,
                  description:   plan.description.slice(0, 300),
                  price:         plan.priceMonthly > 0 ? String(plan.priceMonthly) : "Custom",
                  priceCurrency: "USD",
                  availability:  "https://schema.org/InStock",
                  seller:        { "@id": `${siteUrl}#organization` },
                },
              })),
            }, null, 2));
          }

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
            publisher:    { "@id": `${siteUrl}#organization` },
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          if (hubTerms.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech Glossary Terms",
              url:        canonical,
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ItemList",
            name:       "Free Fintech Marketing Tools",
            url:        canonical,
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
          }, null, 2));
          extraLds.push(JSON.stringify({
            "@context": "https://schema.org",
            "@type":    "ItemList",
            name:       "Fintech SEO Agency Comparisons",
            url:        canonical,
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
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
            dateModified: pageLastmod ?? "2026-05-10",
            inLanguage:   "en",
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
          }, null, 2));
          if (hubLocations.length > 0) {
            extraLds.push(JSON.stringify({
              "@context": "https://schema.org",
              "@type":    "ItemList",
              name:       "Fintech SEO Locations",
              url:        canonical,
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
            ...(pageLastmod ? { dateModified: pageLastmod } : {}),
            about:       { "@id": `${siteUrl}#organization` },
          }, null, 2));

        } else {
          // ── All other static pages — generic WebPage schema ───────────────
          extraLds.push(JSON.stringify({
            "@context":   "https://schema.org",
            "@type":      "WebPage",
            "@id":        canonical,
            url:          canonical,
            name:         staticMeta.title,
            description:  staticMeta.description,
            isPartOf:     { "@id": `${siteUrl}#website` },
            publisher:    { "@id": `${siteUrl}#organization` },
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
