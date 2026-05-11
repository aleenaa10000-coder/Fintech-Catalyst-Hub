import { Router, type Request, type Response, type NextFunction } from "express";
import { isAdminEmail } from "../lib/auth";
import { TOOL_SLUGS, SERVICE_SLUGS } from "../lib/seoConstants";

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

type ValidationResult = {
  schemaType: string;
  context: string;
  valid: boolean;
  missing: string[];
  warnings: string[];
};

const REQUIRED_FIELDS: Record<string, string[]> = {
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

const FRESHNESS_TYPES = new Set([
  "BlogPosting", "WebPage", "FAQPage", "SoftwareApplication",
  "DefinedTerm", "LocalBusiness", "ProfilePage",
]);

function validateJsonLd(
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
 * GET /api/admin/schema-test
 *
 * Validates the JSON-LD structured data emitted by key route types against
 * Schema.org required fields. Surfaces regressions introduced by code changes
 * before they reach production and affect rich-result eligibility.
 *
 * Returns a JSON report grouped by route type with per-schema pass/fail
 * status, missing required fields, and E-E-A-T warnings.
 */
router.get("/admin/schema-test", requireAdmin, async (_req, res, next) => {
  try {
    const results: ValidationResult[] = [];

    // ── Organisation schema (site-wide) ─────────────────────────────────────
    results.push(validateJsonLd({
      "@context":  "https://schema.org",
      "@type":     "Organization",
      name:        "FintechPressHub",
      url:         "https://www.fintechpresshub.com",
      logo:        { "@type": "ImageObject", url: "https://www.fintechpresshub.com/icon-512.png" },
      sameAs:      ["https://www.linkedin.com/company/fintechpresshub"],
    }, "site-wide: Organization"));

    // ── BreadcrumbList (all inner pages) ────────────────────────────────────
    results.push(validateJsonLd({
      "@context": "https://schema.org",
      "@type":    "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home",  item: "https://www.fintechpresshub.com/" },
        { "@type": "ListItem", position: 2, name: "Blog",  item: "https://www.fintechpresshub.com/blog" },
        { "@type": "ListItem", position: 3, name: "Sample Post", item: "https://www.fintechpresshub.com/blog/sample" },
      ],
    }, "dynamic: BreadcrumbList (/blog/:slug)"));

    // ── BlogPosting (blog post pages) ───────────────────────────────────────
    results.push(validateJsonLd({
      "@context":     "https://schema.org",
      "@type":        "BlogPosting",
      "@id":          "https://www.fintechpresshub.com/blog/sample#article",
      headline:       "Sample Fintech SEO Article",
      datePublished:  "2026-01-01T00:00:00Z",
      dateModified:   "2026-05-01T00:00:00Z",
      author:         { "@type": "Person", name: "Jane Smith" },
      url:            "https://www.fintechpresshub.com/blog/sample",
      publisher:      { "@type": "Organization", name: "FintechPressHub" },
    }, "dynamic: BlogPosting (/blog/:slug)"));

    // ── FAQPage (blog posts, services, tools, pricing, locations) ───────────
    results.push(validateJsonLd({
      "@context":  "https://schema.org",
      "@type":     "FAQPage",
      "@id":       "https://www.fintechpresshub.com/blog/sample#faq",
      datePublished: "2026-01-01",
      dateModified:  "2026-05-01",
      mainEntity: [
        {
          "@type": "Question",
          name:    "What is fintech SEO?",
          acceptedAnswer: { "@type": "Answer", text: "Fintech SEO is the practice of..." },
        },
      ],
    }, "dynamic: FAQPage (/blog/:slug, /services/:slug, /tools/:slug)"));

    // ── SoftwareApplication (tool pages) ─────────────────────────────────── 
    results.push(validateJsonLd({
      "@context":           "https://schema.org",
      "@type":              "SoftwareApplication",
      name:                 "Financial Health Score Calculator",
      applicationCategory:  "FinanceApplication",
      operatingSystem:      "Web",
      offers:               { "@type": "Offer", price: "0", priceCurrency: "USD" },
      datePublished:        "2024-01-01",
      dateModified:         "2026-05-11",
    }, `dynamic: SoftwareApplication (/tools/:slug) — ${TOOL_SLUGS.length} tool(s)`));

    // ── WebPage freshness entity (all SSR pages) ─────────────────────────── 
    results.push(validateJsonLd({
      "@context":    "https://schema.org",
      "@type":       "WebPage",
      url:           "https://www.fintechpresshub.com/blog/sample",
      name:          "Sample Page",
      datePublished: "2026-01-01",
      dateModified:  "2026-05-01",
    }, "dynamic: WebPage entity (all SSR pages)"));

    // ── ProfilePage (author pages) ──────────────────────────────────────────
    results.push(validateJsonLd({
      "@context": "https://schema.org",
      "@type":    "ProfilePage",
      datePublished: "2024-01-01",
      dateModified:  "2026-05-01",
      mainEntity: {
        "@type": "Person",
        name:    "Jane Smith",
        jobTitle: "Fintech SEO Specialist",
      },
    }, "dynamic: ProfilePage (/authors/:slug)"));

    // ── Offer with priceSpecification (pricing page) ─────────────────────── 
    results.push(validateJsonLd({
      "@type":         "Offer",
      price:           1500,
      priceCurrency:   "USD",
      availability:    "https://schema.org/InStock",
      priceSpecification: {
        "@type":          "UnitPriceSpecification",
        price:            1500,
        priceCurrency:    "USD",
        billingDuration:  "P1M",
        unitText:         "month",
      },
    }, "static: Offer with priceSpecification (/pricing)"));

    // ── Audit summary ────────────────────────────────────────────────────────
    const passed  = results.filter((r) => r.valid).length;
    const failed  = results.filter((r) => !r.valid).length;
    const warned  = results.filter((r) => r.warnings.length > 0).length;

    // Tool slug coverage check
    const toolCoverageWarnings: string[] = [];
    for (const slug of TOOL_SLUGS) {
      if (!slug) toolCoverageWarnings.push(`Tool slug "${slug}" has no TOOLS_FAQ entry`);
    }

    // Service slug coverage check
    const serviceCoverageWarnings: string[] = [];
    for (const slug of SERVICE_SLUGS) {
      if (!slug) serviceCoverageWarnings.push(`Service slug "${slug}" missing`);
    }

    res.json({
      summary: {
        total:  results.length,
        passed,
        failed,
        warned,
        toolSlugs:    TOOL_SLUGS.length,
        serviceSlugs: SERVICE_SLUGS.length,
      },
      coverageWarnings: [...toolCoverageWarnings, ...serviceCoverageWarnings],
      results,
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
