/**
 * Shared SEO constants used by both the main sitemap (sitemap.xml) and the
 * split sitemap index (sitemap_index.xml / sitemap-pages.xml). Single source
 * of truth — add a new blog category or service slug here and it flows
 * automatically into every sitemap and RSS feed.
 */

export const STATIC_CATEGORY_SLUGS = [
  "payments",
  "embedded-finance",
  "open-banking",
  "neobanking",
  "lending",
  "regtech",
  "wealthtech",
  "fintech-seo",
] as const;

export type CategorySlug = (typeof STATIC_CATEGORY_SLUGS)[number];

/**
 * Service detail page slugs that mirror the DB seed data. Listed here so
 * both the sitemap and the llms.txt handler stay in sync without a DB query
 * on every sitemap request. Update when services are added/removed in the DB.
 */
export const SERVICE_SLUGS = [
  "fintech-content-writing",
  "off-page-seo",
  "guest-posting",
  "topical-authority",
  "fintech-seo-audit",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/**
 * Free tool page slugs. Listed here so sitemap-tools.xml stays in sync with
 * the tools router without a separate list. Update when new tools are added.
 */
export const TOOL_SLUGS = [
  "financial-health-score-calculator",
  "meta-description-generator",
  "guest-post-pitch-generator",
  "readability-checker",
  "keyword-difficulty-estimator",
  "backlink-value-estimator",
  "content-brief-generator",
  "headline-analyzer",
  "link-prospector",
  "outreach-email-generator",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

/**
 * Comparison page slugs. Single source of truth for sitemap-compare.xml.
 * Update when new comparison pages are added to the comparisons data file.
 */
export const COMPARE_SLUGS = [
  "agency-vs-in-house",
  "vs-freelancers",
  "vs-seo-tools",
  "vs-pr-agencies",
  "content-led-vs-paid",
  "specialist-vs-generalist",
] as const;

export type CompareSlug = (typeof COMPARE_SLUGS)[number];

/**
 * Canonical last-modification dates for individual tool pages.
 * Single source of truth shared by sitemap-tools.xml (via sitemapIndex.ts)
 * and the SoftwareApplication JSON-LD in ssrMeta.ts.
 * Update a date here whenever a tool's content or functionality changes.
 */
export const TOOL_PAGE_LASTMOD: Readonly<Record<string, string>> = {
  "financial-health-score-calculator": "2026-05-11",
  "meta-description-generator":        "2026-04-25",
  "guest-post-pitch-generator":        "2026-04-25",
  "readability-checker":               "2026-04-25",
  "keyword-difficulty-estimator":      "2026-04-25",
  "backlink-value-estimator":          "2026-04-25",
  "content-brief-generator":           "2026-04-25",
  "headline-analyzer":                 "2026-04-25",
  "link-prospector":                   "2026-05-09",
  "outreach-email-generator":          "2026-05-09",
};

/**
 * Canonical publication dates for individual compare pages.
 * Single source of truth for FAQPage and WebPage datePublished in ssrMeta.ts.
 * Update when a new comparison page is first published.
 */
export const COMPARE_PAGE_CREATED: Readonly<Record<string, string>> = {
  "agency-vs-in-house":       "2024-09-01",
  "vs-freelancers":           "2024-09-15",
  "vs-seo-tools":             "2024-09-15",
  "vs-pr-agencies":           "2024-10-01",
  "content-led-vs-paid":      "2024-10-15",
  "specialist-vs-generalist": "2024-11-01",
};

/**
 * Canonical last-modification dates for individual compare pages.
 * Single source of truth shared by sitemap-compare.xml and FAQPage JSON-LD.
 * Update a date here whenever a comparison page's content changes.
 */
export const COMPARE_PAGE_LASTMOD: Readonly<Record<string, string>> = {
  "agency-vs-in-house":       "2026-05-15",
  "vs-freelancers":           "2026-05-15",
  "vs-seo-tools":             "2026-05-15",
  "vs-pr-agencies":           "2026-05-15",
  "content-led-vs-paid":      "2026-05-15",
  "specialist-vs-generalist": "2026-05-15",
};

/**
 * Stable last-modification date for service detail pages.
 * Services are seeded once and change infrequently — using `today` wastes
 * crawl budget by signalling a daily update. Update this date manually
 * whenever service content is revised.
 */
export const SERVICE_PAGE_LASTMOD_DATE = "2026-05-15";

/**
 * URL path segment → human-readable label.
 * Single source of truth for BreadcrumbList JSON-LD on the API server
 * (ssrMeta.ts). The frontend (metaData.ts) keeps a parallel copy because
 * cross-package imports from api-server into fintechpresshub are not
 * permitted in this monorepo — update both files when adding new segments.
 * Tool slug entries enable correct intermediate breadcrumb labels on
 * /tools/:slug pages without a second lookup.
 */
export const BREADCRUMB_LABELS: Readonly<Record<string, string>> = {
  about:                               "About",
  services:                            "Services",
  pricing:                             "Pricing",
  blog:                                "Blog",
  authors:                             "Authors",
  tools:                               "Free Tools",
  press:                               "Press",
  glossary:                            "Glossary",
  compare:                             "Comparisons",
  resources:                           "Resources",
  category:                            "Category",
  contact:                             "Contact",
  "privacy-policy":                    "Privacy Policy",
  "refund-policy":                     "Refund Policy",
  "cookie-policy":                     "Cookie Policy",
  terms:                               "Terms",
  "editorial-guidelines":              "Editorial Guidelines",
  "community-guidelines":              "Community Guidelines",
  "write-for-us":                      "Write For Us",
  "fintech-publications":              "Fintech Publications",
  locations:                           "Locations",
  "financial-health-score-calculator": "Financial Health Score Calculator",
  "meta-description-generator":        "Meta Description Generator",
  "guest-post-pitch-generator":        "Guest Post Pitch Generator",
  "readability-checker":               "Readability Checker",
  "keyword-difficulty-estimator":      "Keyword Difficulty Estimator",
  "backlink-value-estimator":          "Backlink Value Estimator",
  "content-brief-generator":           "Content Brief Generator",
  "headline-analyzer":                 "Headline Analyzer",
  "link-prospector":                   "Link Prospector",
  "outreach-email-generator":          "Outreach Email Generator",
  tag:                                 "Tag",
};

/**
 * Escape special XML/HTML characters.
 * Shared utility consumed by sitemap generators, RSS feeds, and the OG image
 * SVG builder. Single source of truth — import from here instead of defining
 * local copies in each file.
 */
export function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Shared site description used in RSS channel headers and llms.txt.
 * Single source of truth — previously duplicated in rss.ts, authorRss.ts,
 * and categoryRss.ts.
 */
export const RSS_SITE_DESCRIPTION =
  "Insights, playbooks, and field reports on fintech SEO, content marketing, and digital PR.";

/**
 * Human-readable labels for blog category slugs.
 * Single source of truth — previously duplicated in sitemapIndex.ts and
 * categoryRss.ts. Update here when categories are added or renamed; changes
 * flow automatically into the sitemap, RSS feeds, and meta tags.
 */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  "payments":         "Payments",
  "embedded-finance": "Embedded Finance",
  "open-banking":     "Open Banking",
  "neobanking":       "Neobanking",
  "lending":          "Lending",
  "regtech":          "RegTech",
  "wealthtech":       "Wealthtech",
  "fintech-seo":      "Fintech SEO",
};
