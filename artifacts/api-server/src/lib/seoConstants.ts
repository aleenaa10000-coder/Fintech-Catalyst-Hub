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
