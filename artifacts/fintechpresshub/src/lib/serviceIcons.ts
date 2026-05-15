import {
  PenTool,
  Link2,
  Newspaper,
  Network,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const serviceIconBySlug: Record<string, LucideIcon> = {
  "fintech-content-writing": PenTool,
  "off-page-seo": Link2,
  "guest-posting": Newspaper,
  "topical-authority": Network,
  "fintech-seo-audit": Search,
};

export const serviceShortLabelBySlug: Record<string, string> = {
  "fintech-content-writing": "Content Writing",
  "off-page-seo": "Off-Page SEO",
  "guest-posting": "Guest Posting",
  "topical-authority": "Topical Authority",
  "fintech-seo-audit": "SEO Audits",
};

/**
 * Schema.org `serviceType` values for each service's FinancialService JSON-LD.
 * These are explicit financial-domain strings so that Google's Knowledge Graph
 * and LLM citation engines classify each offering precisely rather than relying
 * on a generic label.
 */
export const serviceFinancialTypeBySlug: Record<string, string> = {
  "fintech-content-writing": "Financial Content Marketing",
  "off-page-seo": "Financial Off-Page SEO and Link Building",
  "guest-posting": "Financial Guest Publishing and Media Relations",
  "topical-authority": "Fintech Topical Authority Development",
  "fintech-seo-audit": "Financial SEO Audit and Consulting",
};

/**
 * Schema.org `category` values per service — more specific than the shared
 * "Fintech Marketing" umbrella, helping AI systems distinguish between
 * content, link-building, and audit offerings within FinancialService.
 */
export const serviceCategoryBySlug: Record<string, string> = {
  "fintech-content-writing": "Financial Content Marketing",
  "off-page-seo": "Financial Link Building",
  "guest-posting": "Financial Media Relations",
  "topical-authority": "Financial SEO Strategy",
  "fintech-seo-audit": "Financial SEO Consulting",
};

/**
 * `knowsAbout` topic arrays for each service's FinancialService JSON-LD.
 * Each topic becomes a `Thing` node so Knowledge Graph and LLM engines
 * can map the service to specific fintech sub-verticals.
 */
export const serviceKnowsAboutBySlug: Record<string, string[]> = {
  "fintech-content-writing": [
    "Fintech Content Marketing",
    "Payments Content",
    "Embedded Finance",
    "B2B Lending Content",
    "Open Banking",
    "Neobanking",
    "RegTech Content",
    "Wealthtech Content",
    "BNPL Content",
    "Financial Services Copywriting",
  ],
  "off-page-seo": [
    "Fintech Link Building",
    "Financial Services Off-Page SEO",
    "Domain Authority Building",
    "Digital PR for Fintech",
    "Finance Publication Outreach",
    "Backlink Strategy",
    "Payments SEO",
    "Open Banking SEO",
  ],
  "guest-posting": [
    "Fintech Guest Posting",
    "Finance Publication Placements",
    "Editorial Link Building",
    "Executive Thought Leadership",
    "Financial Media Relations",
    "BNPL Coverage",
    "Embedded Finance Media",
    "Payments Industry Press",
  ],
  "topical-authority": [
    "Topical Authority Building",
    "Fintech SEO Strategy",
    "Content Cluster Development",
    "Keyword Research for Fintech",
    "Payments SEO",
    "Lending SEO",
    "Open Banking SEO",
    "Neobanking SEO",
    "Embedded Finance SEO",
    "Wealthtech SEO",
  ],
  "fintech-seo-audit": [
    "Technical SEO Audit",
    "Fintech SEO Strategy",
    "Competitor Content Analysis",
    "Content Gap Analysis",
    "Core Web Vitals",
    "Financial Services Compliance SEO",
    "SEO Performance Benchmarking",
    "Keyword Opportunity Mapping",
  ],
};

/**
 * `about` topic entity arrays for each service's WebPage JSON-LD.
 * Distinct from `knowsAbout` (service provider knowledge) — these are the
 * primary subjects the page content is about, enabling AI citation engines
 * to slot each service page into the correct topic cluster.
 */
export const serviceAboutBySlug: Record<string, string[]> = {
  "fintech-content-writing": [
    "Fintech Content Writing",
    "Financial Services Content Marketing",
    "SEO Content for Fintech",
  ],
  "off-page-seo": [
    "Off-Page SEO for Fintech",
    "Financial Link Building",
    "Fintech Domain Authority",
  ],
  "guest-posting": [
    "Fintech Guest Posting",
    "Finance Publication Placements",
    "Editorial Backlink Building",
  ],
  "topical-authority": [
    "Topical Authority for Fintech",
    "Content Cluster SEO",
    "Fintech SEO Strategy",
  ],
  "fintech-seo-audit": [
    "Fintech SEO Audit",
    "Technical SEO for Financial Services",
    "SEO Competitor Analysis",
  ],
};

/**
 * Markets served by each service — emitted as structured `areaServed` Place
 * entities on FinancialService JSON-LD. Enables Google Knowledge Graph and AI
 * citation engines to associate each service with specific geographic markets
 * (International SEO signal I1–I3).
 */
export const serviceAreaServedBySlug: Record<string, string[]> = {
  "fintech-content-writing": [
    "United States",
    "United Kingdom",
    "Singapore",
    "Australia",
    "Canada",
    "European Union",
  ],
  "off-page-seo": [
    "United States",
    "United Kingdom",
    "Singapore",
    "Australia",
    "Canada",
  ],
  "guest-posting": [
    "United States",
    "United Kingdom",
    "Singapore",
    "Australia",
    "Canada",
  ],
  "topical-authority": [
    "United States",
    "United Kingdom",
    "Singapore",
    "Australia",
    "Canada",
  ],
  "fintech-seo-audit": [
    "United States",
    "United Kingdom",
    "Singapore",
    "Australia",
    "Canada",
    "European Union",
  ],
};

/**
 * Canonical publication dates for each service detail page.
 * Used in WebPage and FinancialService JSON-LD as `datePublished` freshness
 * signals. Single source of truth for the frontend (api-server uses
 * SERVICE_PAGE_LASTMOD_DATE in seoConstants.ts — cross-package imports
 * are not permitted from fintechpresshub into api-server).
 */
export const serviceDatePublishedBySlug: Record<string, string> = {
  "fintech-content-writing": "2021-03-01",
  "off-page-seo":            "2021-03-01",
  "guest-posting":           "2021-06-01",
  "topical-authority":       "2022-01-01",
  "fintech-seo-audit":       "2022-06-01",
};

/**
 * Stable last-modification date for service detail pages (frontend mirror of
 * SERVICE_PAGE_LASTMOD_DATE in api-server/src/lib/seoConstants.ts).
 * Update this string whenever service content is materially revised — using
 * `new Date()` was incorrect because it signalled a daily change to crawlers
 * on pages with stable content, wasting crawl budget.
 */
export const SERVICE_PAGE_LASTMOD = "2026-05-15";

export function getServiceIcon(slug: string): LucideIcon {
  return serviceIconBySlug[slug] ?? Sparkles;
}
