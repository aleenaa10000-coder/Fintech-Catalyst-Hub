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

export function getServiceIcon(slug: string): LucideIcon {
  return serviceIconBySlug[slug] ?? Sparkles;
}
