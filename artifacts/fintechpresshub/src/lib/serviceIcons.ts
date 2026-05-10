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

export function getServiceIcon(slug: string): LucideIcon {
  return serviceIconBySlug[slug] ?? Sparkles;
}
