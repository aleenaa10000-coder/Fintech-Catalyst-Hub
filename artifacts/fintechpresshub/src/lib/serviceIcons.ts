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

export function getServiceIcon(slug: string): LucideIcon {
  return serviceIconBySlug[slug] ?? Sparkles;
}
