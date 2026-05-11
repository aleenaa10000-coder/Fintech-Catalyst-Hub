/**
 * Shared JSON-LD structured-data validator used by both the admin
 * schema-test HTTP route and the daily schema-health background job.
 *
 * Keeping the rule-set in one place means a field addition or schema
 * change is reflected in both the API response and the email alert
 * without the two drifting apart.
 */

export type ValidationResult = {
  schemaType: string;
  context: string;
  valid: boolean;
  missing: string[];
  warnings: string[];
};

export const REQUIRED_FIELDS: Record<string, string[]> = {
  BlogPosting:         ["@context", "@type", "headline", "datePublished", "author", "url"],
  FAQPage:             ["@context", "@type", "mainEntity"],
  BreadcrumbList:      ["@context", "@type", "itemListElement"],
  SoftwareApplication: ["@context", "@type", "name", "applicationCategory", "operatingSystem", "offers"],
  DefinedTerm:         ["@context", "@type", "name", "description"],
  LocalBusiness:       ["@context", "@type", "name", "address"],
  ProfilePage:         ["@context", "@type", "mainEntity"],
  HowTo:               ["@context", "@type", "name", "step"],
  WebPage:             ["@context", "@type", "url", "name", "dateModified"],
  ItemList:            ["@context", "@type", "itemListElement"],
  Organization:        ["@context", "@type", "name", "url", "logo"],
  AggregateRating:     ["ratingValue", "ratingCount", "bestRating"],
  Offer:               ["@type", "price", "priceCurrency", "availability"],
};

export const FRESHNESS_TYPES = new Set([
  "BlogPosting", "WebPage", "FAQPage", "SoftwareApplication",
  "DefinedTerm", "LocalBusiness", "ProfilePage",
]);

export function validateJsonLd(
  ld: Record<string, unknown>,
  context: string,
): ValidationResult {
  const rawType = ld["@type"];
  const schemaType = Array.isArray(rawType) ? rawType[0] : (rawType as string) ?? "Unknown";

  const required = REQUIRED_FIELDS[schemaType] ?? [];
  const missing = required.filter((f) => ld[f] == null);
  const warnings: string[] = [];

  if (FRESHNESS_TYPES.has(schemaType)) {
    if (!ld["datePublished"]) warnings.push("datePublished missing — hurts E-E-A-T freshness signal");
    if (!ld["dateModified"])  warnings.push("dateModified missing — crawlers cannot detect staleness");
  }

  if (schemaType === "FAQPage") {
    const entities = ld["mainEntity"];
    if (Array.isArray(entities) && entities.length === 0) {
      warnings.push("mainEntity is empty — FAQPage will not qualify for rich results");
    }
  }

  if (schemaType === "BreadcrumbList") {
    const items = ld["itemListElement"];
    if (!Array.isArray(items) || items.length < 2) {
      warnings.push("itemListElement has fewer than 2 items — breadcrumb trail won't render in SERPs");
    }
  }

  return { schemaType, context, valid: missing.length === 0, missing, warnings };
}

/**
 * The canonical set of representative JSON-LD fixtures that cover every
 * schema type the site emits. Both the admin route and the health-check
 * job validate these same fixtures so drift between the two is impossible.
 */
export function buildSchemaFixtures(): Array<[Record<string, unknown>, string]> {
  const today = new Date().toISOString().slice(0, 10);
  return [
    [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "FintechPressHub",
        url: "https://www.fintechpresshub.com",
        logo: { "@type": "ImageObject", url: "https://www.fintechpresshub.com/icon-512.png" },
        sameAs: ["https://www.linkedin.com/company/fintechpresshub"],
      },
      "site-wide: Organization",
    ],
    [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home",       item: "https://www.fintechpresshub.com/" },
          { "@type": "ListItem", position: 2, name: "Blog",       item: "https://www.fintechpresshub.com/blog" },
          { "@type": "ListItem", position: 3, name: "Sample Post", item: "https://www.fintechpresshub.com/blog/sample" },
        ],
      },
      "dynamic: BreadcrumbList (/blog/:slug)",
    ],
    [
      {
        "@context":    "https://schema.org",
        "@type":       "BlogPosting",
        "@id":         "https://www.fintechpresshub.com/blog/sample#article",
        headline:      "Sample Fintech SEO Article",
        datePublished: "2026-01-01T00:00:00Z",
        dateModified:  `${today}T00:00:00Z`,
        author:        { "@type": "Person", name: "Jane Smith" },
        url:           "https://www.fintechpresshub.com/blog/sample",
        publisher:     { "@type": "Organization", name: "FintechPressHub" },
      },
      "dynamic: BlogPosting (/blog/:slug)",
    ],
    [
      {
        "@context":    "https://schema.org",
        "@type":       "FAQPage",
        "@id":         "https://www.fintechpresshub.com/blog/sample#faq",
        datePublished: "2026-01-01",
        dateModified:  today,
        mainEntity: [
          {
            "@type": "Question",
            name:    "What is fintech SEO?",
            acceptedAnswer: { "@type": "Answer", text: "Fintech SEO is the practice of..." },
          },
        ],
      },
      "dynamic: FAQPage (/blog/:slug, /services/:slug, /tools/:slug)",
    ],
    [
      {
        "@context":           "https://schema.org",
        "@type":              "SoftwareApplication",
        name:                 "Financial Health Score Calculator",
        applicationCategory:  "FinanceApplication",
        operatingSystem:      "Web",
        offers:               { "@type": "Offer", price: "0", priceCurrency: "USD" },
        datePublished:        "2024-01-01",
        dateModified:         today,
      },
      "dynamic: SoftwareApplication (/tools/:slug)",
    ],
    [
      {
        "@context":    "https://schema.org",
        "@type":       "WebPage",
        url:           "https://www.fintechpresshub.com/blog/sample",
        name:          "Sample Page",
        datePublished: "2026-01-01",
        dateModified:  today,
      },
      "dynamic: WebPage entity (all SSR pages)",
    ],
    [
      {
        "@context":    "https://schema.org",
        "@type":       "ProfilePage",
        datePublished: "2024-01-01",
        dateModified:  today,
        mainEntity:    { "@type": "Person", name: "Jane Smith", jobTitle: "Fintech SEO Specialist" },
      },
      "dynamic: ProfilePage (/authors/:slug)",
    ],
    [
      {
        "@type":         "Offer",
        price:           1500,
        priceCurrency:   "USD",
        availability:    "https://schema.org/InStock",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: 1500, priceCurrency: "USD", billingDuration: "P1M", unitText: "month",
        },
      },
      "static: Offer with priceSpecification (/pricing)",
    ],
  ];
}
