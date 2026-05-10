/**
 * Shared SEO constants for build-time scripts (prerender.mjs, bot-og-plugin.mjs).
 *
 * This file is the ESM/JavaScript counterpart of:
 *   artifacts/api-server/src/lib/seoConstants.ts
 *
 * IMPORTANT: when adding or removing categories, tools, compare pages, or
 * service slugs, update BOTH this file and seoConstants.ts in lockstep.
 * The TypeScript file drives the runtime server; this file drives the
 * build-time prerender and development bot-OG middleware.
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
];

export const SERVICE_SLUGS = [
  "fintech-content-writing",
  "off-page-seo",
  "guest-posting",
  "topical-authority",
  "fintech-seo-audit",
];

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
];

export const COMPARE_SLUGS = [
  "agency-vs-in-house",
  "vs-freelancers",
  "vs-seo-tools",
  "vs-pr-agencies",
  "content-led-vs-paid",
  "specialist-vs-generalist",
];
