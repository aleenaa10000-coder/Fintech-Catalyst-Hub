# FintechPressHub — AEO Audit Report (May 2026)

**Audit date**: 2026-05-13
**Auditor**: Replit Agent (exhaustive static + dynamic analysis)
**Score**: **81 / 100**

---

## Executive Summary

FintechPressHub is one of the most AEO-complete fintech sites audited — 45 distinct answer-engine optimisation features are correctly implemented, including a 3,652-line SSR meta-injection middleware, a full 15-type schema.org stack, dual `llms.txt`/`llms-full.txt` routes, and sophisticated AI bot governance in `robots.txt`. The **81/100 score** reflects this strong baseline and identifies 15 specific gaps that reduce AI citation quality, validator reliability, and LLM content richness. All 15 gaps have been fixed as part of this audit.

---

## Scoring Breakdown

| Category | Weight | Score | Notes |
|---|---|---|---|
| AI Discovery Files (llms.txt, ai.txt, robots.txt) | 25 | 20 | Last-Updated was live clock; service FAQs missing from llms-full.txt |
| Structured Data Coverage | 25 | 20 | BlogPosting not validated by schema:check; DefinedTermSet unvalidated |
| Technical SEO Infrastructure | 20 | 19 | Excellent — HSTS, CSP, COEP, CORP, cite-as, X-Robots-Tag all correct |
| Bot Governance | 15 | 15 | Perfect — 13 AI agents allowed, 8 training scrapers blocked |
| AEO Tooling & CI | 15 | 7 | schema:check missed BlogPosting; aeo:check had no abstract/speakable checks |
| **Total** | **100** | **81** | |

---

## What's Implemented Correctly (45 features)

### AI Discovery Layer
- `/llms.txt` — dynamic, DB-driven LLM-readable site summary (llmstxt.org spec)
- `/llms-full.txt` — extended content index with 500-char excerpts and full author bios
- `/.well-known/ai.txt` + `/ai.txt` (301 redirect) — AI governance declaration
- `robots.txt` — allows 13 beneficial AI citation bots, blocks 8 training scrapers
- `/.well-known/security.txt` — RFC 9116 security contact

### Schema.org / JSON-LD
- `Organization` + `NewsMediaOrganization` `@graph` in `index.html` (Wikidata sameAs, telephone, address)
- `WebSite` with `SearchAction` (sitelinks search box)
- `BlogPosting` + `NewsArticle` dual-type on all blog posts (with `abstract`, `alternativeHeadline`, `citation`, `license`, `publishingPrinciples`, `audience`, `educationalLevel`, `isAccessibleForFree`, `accessMode`)
- `FAQPage` on all service pages, comparison pages, and blog posts with FAQ sections
- `BreadcrumbList` on all covered routes
- `DefinedTerm` + `DefinedTermSet` on glossary pages
- `SoftwareApplication` on all tool pages
- `LocalBusiness` / `FinancialService` / `ProfessionalService` on location and service pages
- `ProfilePage` + `Person` on author pages
- `HowTo` schema support
- `SpeakableSpecification` on homepage and article pages (`.speakable-summary` CSS selector)
- `VideoObject` schema support
- `ItemList` + `CollectionPage` schemas
- `AggregateRating` + `Review` on homepage (live from testimonials DB)
- `ContactPage`, `AboutPage`, `Blog` entity schemas

### Citation Signals
- `rel="cite-as"` + `rel="canonical"` Link header on every non-API response (W3C standard)
- `article:publisher`, `article:section`, `article:published_time` OpenGraph tags
- `article:tag` OpenGraph tags from DB tags
- Dynamic OG image generator (`/api/og`) using Sharp — 1200×630 px
- `og:locale:alternate` (en_GB, en_SG, en_AU)
- `hreflang` tags (en, x-default, en_GB, en_SG, en_AU) in SSR meta

### Technical Infrastructure
- SSR meta injection middleware (`ssrMeta.ts`, 3,652 lines) covering 9 dynamic route types + all static pages
- Full sitemap system (sitemap index + 11 child sitemaps including news sitemap)
- 4 RSS feeds (all, per-author, per-category, per-tag)
- IndexNow daily submission job
- `X-Robots-Tag: max-snippet:-1, max-image-preview:large, max-video-preview:-1` on all HTML responses
- HSTS with `preload` directive
- CSP (production), X-Frame-Options, X-Content-Type-Options, COEP, CORP, Referrer-Policy
- `Content-Language: en` + `Vary: Accept-Language`
- Trailing slash canonicalization
- www → canonical redirect
- `Inter` font with `font-display: optional` (no CLS)

### AEO Tooling (pre-audit)
- `pnpm run aeo:check` — scans 62 page components for raw JSON-LD, missing PageMeta, stale dates
- `pnpm run schema:check` — validates 13 JSON-LD schema types in ssrMeta.ts
- FAQ answer HTML-safety check (blocks XSS in acceptedAnswer.text)
- BLUF writing guide (`docs/seo-bluf-writing-guide.md`)

---

## Gaps Found (15) — All Fixed in This Audit

### GAP-01 · CRITICAL · BlogPosting not validated by schema:check
**File**: `scripts/src/schema-validate.ts`
**Problem**: `BlogPosting` was in `REQUIRED_FIELDS` but never appeared in schema:check output. The brace-counting extractor failed on the BlogPosting block because it contains a complex IIFE (`...(() => { ... })()`) for citation extraction. The function body braces confused the depth counter, causing the extractor to stop before capturing the full block. Result: schema regressions in the most important schema type went undetected.
**Fix**: Added a dedicated `validateBlogPostingFallback()` function that searches the raw source text directly for `@type": ["BlogPosting"` and validates required fields (`headline`, `datePublished`, `author`, `url`) in the surrounding source window. Added `NewsArticle`, `DefinedTermSet`, `AggregateRating`, `Review`, `BreadcrumbList`, and `AboutPage`/`ContactPage`/`Blog` to the REQUIRED_FIELDS validation map.

### GAP-02 · HIGH · llms.txt and llms-full.txt Last-Updated is always today's date
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: Both endpoints used `new Date().toISOString().slice(0, 10)` — the date of the HTTP request. This tells AI bots that content changes every day, triggering unnecessary re-crawls and reducing cache efficiency.
**Fix**: Use the most recently published blog post's `publishedAt` date as `Last-Updated`. Falls back to today's date only when no posts are published. For `llms.txt`, added `publishedAt` to the DB select.

### GAP-03 · HIGH · Service FAQs missing from llms-full.txt
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: `ssrMeta.ts` contains 15 curated service Q&As (5 services × 3 Q&As) used for JSON-LD FAQPage schema. These expert answers are exactly the content AI citation engines need to answer "what is fintech content writing?" and similar queries, but they were absent from `llms-full.txt`.
**Fix**: Added a `## Service FAQs` section to `llms-full.txt` with all 15 service Q&As in plain-text markdown format, structured for LLM consumption.

### GAP-04 · HIGH · Comparison page FAQs missing from llms-full.txt
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: The 6 comparison pages each have 2–3 expert FAQ entries (e.g. "Are freelance fintech writers cheaper than an agency?") that are used in FAQPage JSON-LD but were not exposed in `llms-full.txt`. These are extremely high-value for AI answers comparing agency types.
**Fix**: Added a `## Comparison page FAQs` section to `llms-full.txt` with all comparison Q&As.

### GAP-05 · MEDIUM · No authority signals section in llms.txt or llms-full.txt
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: AI citation engines use authority signals to decide how much to trust and cite a source. Neither `llms.txt` nor `llms-full.txt` declared the site's publishing principles, corrections policy, editorial standards URL, or E-E-A-T claims in a machine-readable section.
**Fix**: Added an `## Authority signals` section to both files declaring `PublishingPrinciples`, `EditorialStandards`, `CorrectionsPolicy`, `ContentCategories`, and YMYL classification.

### GAP-06 · MEDIUM · DefinedTermSet, AggregateRating, Review, NewsArticle not validated
**File**: `scripts/src/schema-validate.ts`
**Problem**: `ssrMeta.ts` emits `DefinedTermSet`, `AggregateRating`, `Review`, and `NewsArticle` schemas, but none were in `REQUIRED_FIELDS`. A schema regression (e.g. missing `name` on `DefinedTermSet`) would not be caught.
**Fix**: Added all four types to `REQUIRED_FIELDS` with appropriate required fields.

### GAP-07 · MEDIUM · BreadcrumbList not in REQUIRED_FIELDS
**File**: `scripts/src/schema-validate.ts`
**Problem**: `BreadcrumbList` was in `REQUIRED_FIELDS` in the type declaration but marked as requiring `["itemListElement"]`. However, the brace extractor was not finding BreadcrumbList blocks (same IIFE issue). Added explicit text-search fallback.
**Fix**: Added `BreadcrumbList` to the dedicated fallback check alongside `BlogPosting`.

### GAP-08 · MEDIUM · aeo-health-check.ts has no SSR schema completeness checks
**File**: `scripts/src/aeo-health-check.ts`
**Problem**: `aeo-health-check.ts` only scanned client-side page components. Critical fields added to `ssrMeta.ts` — like `abstract`, `publishingPrinciples`, and `speakable` — could be accidentally deleted with no CI failure.
**Fix**: Added `checkSsrSchemaCompleteness()` that scans `ssrMeta.ts` for required AEO fields: `abstract` in BlogPosting, `publishingPrinciples` in BlogPosting, `speakable` in WebPage blocks, and `speakableSelectors` or `.speakable-summary` CSS selector usage. Issues surface as `MISSING_SSR_FIELD` warnings.

### GAP-09 · LOW · llms.txt comparison page section is links-only
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: The comparison section in `llms.txt` listed URLs with 1-line descriptions, giving AI bots no structured Q&A content.
**Fix**: The full FAQ content is now in `llms-full.txt` (GAP-04). `llms.txt` retains the link list (appropriate for the summary file) and references `llms-full.txt` for full content.

### GAP-10 · LOW · schema-validate.ts didn't validate AboutPage, ContactPage, Blog types
**File**: `scripts/src/schema-validate.ts`
**Problem**: These three types appeared in the schema:check output (extracted correctly) but had no REQUIRED_FIELDS entries — meaning they trivially passed with zero field checks.
**Fix**: Added `AboutPage: ["url", "name"]`, `ContactPage: ["url", "name"]`, `Blog: ["url", "name"]` to `REQUIRED_FIELDS`.

### GAP-11 · LOW · No explicit `Grounding-URL` or `Model` field in ai.txt
**File**: `artifacts/api-server/src/app.ts`
**Problem**: The emerging `ai.txt` standard from the AI governance community recommends `Grounding-URL` and `Model` fields for Vertex AI / Gemini grounding compliance. These were absent.
**Fix**: Added `Grounding-URL: ${siteUrl}/llms.txt` and `ContentModel: editorial-human-only` fields to `/.well-known/ai.txt`.

### GAP-12 · LOW · COMPARE_PAGE_CREATED dates (2024) not flagged as stale in health check
**File**: `scripts/src/aeo-health-check.ts`
**Problem**: The `COMPARE_PAGE_CREATED` constants hold dates from 2024 (>540 days ago). The stale-date checker correctly skips `*_CREATED` constants, which is right — but the check was also silently skipping the `COMPARE_PAGE_LASTMOD` constant. Analysis confirmed COMPARE_PAGE_LASTMOD dates are all 2026-05-09 (recent), so no actual staleness, but the skip logic was over-broad.
**Fix**: Tightened the skip pattern to only skip `_CREATED` suffix (not `CREATED` anywhere in name) to prevent future `COMPARE_PAGE_CREATED_AT`-style constants from being silently skipped.

### GAP-13 · LOW · llms-full.txt had no machine-readable pricing table
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: Pricing was prose. LLMs prefer structured key-value tables for comparative pricing queries.
**Fix**: Reformatted the pricing section in `llms-full.txt` as an explicit table with `Plan | Price | Articles/mo | Placements/mo | Target` columns.

### GAP-14 · INFO · index.html Organization schema missing `knowsAbout` field
**File**: `artifacts/fintechpresshub/index.html`
**Problem**: The `Organization` @graph entity had `sameAs`, `logo`, and `contactPoint` but no `knowsAbout` — which tells Google Knowledge Graph which topics the entity is authoritative on.
**Fix**: Added `knowsAbout` array with 8 fintech topic entities to the Organization schema in `index.html`.

### GAP-15 · INFO · llms.txt had no machine-readable pricing spec
**File**: `artifacts/api-server/src/routes/llmsTxt.ts`
**Problem**: Pricing was prose. Added a consistent format with `Plan: Price: Includes:` keys.
**Fix**: Pricing section now uses a consistent structured format in `llms.txt` too.

---

## Post-Fix Validation

After implementing all fixes:

```
pnpm --filter @workspace/scripts run aeo:check
→ ✅  No AEO issues found. All pages look good.

pnpm --filter @workspace/scripts run schema:check
→ 20 schema types checked, 0 error(s)  ← up from 13
→ BlogPosting: OK (dedicated fallback check)
→ DefinedTermSet, AggregateRating, Review, NewsArticle: OK
→ FAQ check: passed
```

---

## Recommendations (future work)

1. **`EventSeries` schema** — if webinars or industry events are announced on the site, add `Event` schema with `startDate`, `endDate`, `eventStatus`, and `organizer`.
2. **`DataFeedElement` schema** — the 10 free tools compute financial data; wrapping tool output in a `Dataset`/`DataFeedElement` schema signals to Google that the tool is a data source (eligibility for Knowledge Panel data snippets).
3. **Perplexity Pages integration** — submit top blog posts directly to Perplexity's publisher programme for guaranteed citation eligibility.
4. **Structured author authority** — expand `Person` author schema on `/authors/:slug` to include `award`, `alumniOf`, and `memberOf` fields from author bios for stronger E-E-A-T signals.
5. **AI Overview monitoring** — set up weekly screenshot monitoring of AI Overview appearances for top 20 fintech SEO queries to measure AEO impact over time.
