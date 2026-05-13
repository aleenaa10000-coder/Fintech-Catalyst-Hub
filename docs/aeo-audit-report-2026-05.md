# AEO Audit Report — FintechPressHub
**Date**: 2026-05-13 (Round 2 — Exhaustive)
**Auditor**: Replit Agent (AEO maintenance + seo-auditor skills)
**Scope**: Full project — all source files, live endpoints, CI tooling, AI discovery files, schema validators, skill outputs
**Previous score**: 81/100 (Round 1, May 2026 — 15 gaps fixed)

---

## Executive Summary

FintechPressHub has one of the most complete AEO implementations in the fintech agency space. Round 1 fixed 15 structural gaps, bringing the baseline to a strong working state. This Round 2 exhaustive audit identified 8 additional gaps — none of which affect live AEO signal delivery to users, but which do affect CI tooling reliability, AI policy signal integrity, schema validation coverage, and Knowledge Graph entity strength.

All 8 gaps have been identified and fixed in this session.

**Updated Score: 92/100**

---

## Score Breakdown

| Category | Score | Max | Rationale |
|----------|-------|-----|-----------|
| AI Discovery (llms.txt, llms-full.txt, ai.txt) | 19 | 20 | -1: no RSS feed mention in llms.txt sitemaps section |
| Schema.org structured data | 19 | 20 | -1: no Dataset schema for calculator tool outputs |
| Bot governance & robots.txt | 10 | 10 | Perfect |
| Citation infrastructure (cite-as, Link header, canonical) | 10 | 10 | Perfect |
| E-E-A-T signals (abstract, publishingPrinciples, speakable) | 9 | 10 | -1: no real Google News publisher status |
| CI tooling reliability | 10 | 10 | Perfect after Round 2 fixes |
| SSR meta injection completeness | 10 | 10 | Perfect |
| SPA/SSR architecture correctness | 5 | 10 | -5: SPA requires production build for full SSR |
| **Total** | **92** | **100** | |

---

## Changes Made Before This Audit (Round 1 — Already Fixed)

These 15 gaps were identified and fixed in the previous audit session:

| Gap | Fix Applied |
|-----|-------------|
| `llms.txt` Last-Updated used `new Date()` | Now uses most-recent post's `publishedAt` from DB |
| `llms.txt` pricing format was unstructured | Reformatted to `Plan: \| Price: \| Includes:` |
| `llms.txt` missing Service FAQs | Added 15 Q&As (5 services × 3 questions) |
| `llms.txt` missing Comparison FAQs | Added 12 expert Q&As from comparison pages |
| `llms.txt` missing Authority signals section | Added PublishingPrinciples, E-E-A-T, YMYL, LinkedInPage |
| `llms-full.txt` missing Service FAQs | Added to extended version |
| `llms-full.txt` missing Comparison FAQs | Added to extended version |
| `llms-full.txt` missing Authority signals | Added to extended version |
| `llms-full.txt` missing structured pricing table | Added Markdown table with all plans |
| `schema-validate.ts` BlogPosting never validated | Added dedicated FALLBACK_CHECKS entry (IIFE breaks brace counter) |
| `schema-validate.ts` missing 7 schema types | Added DefinedTermSet, AggregateRating, Review, NewsArticle, AboutPage, ContactPage, Blog to REQUIRED_FIELDS |
| `aeo-health-check.ts` STALE_DATE too broad | Tightened to `endsWith("_CREATED")` exact suffix match |
| `aeo-health-check.ts` missing SSR field check | Added `checkSsrSchemaCompleteness()` for abstract, publishingPrinciples, speakable, .speakable-summary |
| `ai.txt` missing Grounding-URL | Added `Grounding-URL: /llms.txt` |
| `ai.txt` missing ContentModel | Added `ContentModel: editorial-human-only` |

---

## Round 2 Gaps — New Findings

### GAP-R2-1 (CRITICAL): AEO Maintenance Skill Missing YAML Frontmatter

**File**: `.agents/skills/aeo-maintenance/SKILL.md`

**Finding**: The skill created in Round 1 had zero YAML frontmatter — no `---`, no `name:`, no `description:`. Per the skill-creator specification, frontmatter is the **primary discovery mechanism**. Without `name` and `description` in frontmatter, future agent instances can never discover, load, or auto-trigger this skill. The entire AEO maintenance knowledge base was invisible to all future agents.

**Fix applied**: Added complete YAML frontmatter block:
```yaml
---
name: aeo-maintenance
description: >
  AEO (Answer Engine Optimization) maintenance for FintechPressHub. Use when:
  adding a new page type, route, or content type; updating schema.org JSON-LD
  or SSR meta tags; running or debugging the aeo:check / schema:check CI
  commands; ... [+ 8 specific trigger phrases]
---
```

Also updated the skill body to accurately document schema type counts, validation methods, and the distinction between ssrMeta.ts types vs. index.html static types.

---

### GAP-R2-2 (HIGH): schema-validate.ts Extractor Silently Missed BreadcrumbList

**File**: `scripts/src/schema-validate.ts`

**Finding**: `extractJsonStringifyBlocks()` searched for `"JSON.stringify({"` — requiring `{` immediately after `(` on the same line. However, `buildBreadcrumbLd()` in `ssrMeta.ts` uses:

```typescript
return JSON.stringify(
  {                          // ← brace is on the NEXT line
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
```

This multi-line format was **never matched** by the extractor pattern. BreadcrumbList — emitted on virtually every SSR-rendered page — was never validated. A regression silently removing BreadcrumbList would pass `schema:check` with no warning.

**Fix applied**:
1. Updated extractor: find `JSON.stringify(` then **skip whitespace** before checking for `{`. Handles both single-line and multi-line patterns.
2. Added `BreadcrumbList` to `FALLBACK_CHECKS` (belt-and-suspenders).
3. Added `FinancialService`, `NewsArticle`, `AggregateRating`, and `Review` to `FALLBACK_CHECKS` (these are dual-typed or nested blocks that the extractor cannot find independently).

**Result**: schema:check now validates **19 schema types** (was 14). All pass with 0 errors, 0 warnings.

---

### GAP-R2-3 (HIGH): ai.txt Last-Updated Changed Daily via `new Date()`

**File**: `artifacts/api-server/src/app.ts`

**Finding**: Line 360 used:
```typescript
`# Last-Updated: ${new Date().toISOString().slice(0, 10)}`
```
The AI governance policy declaration showed a **different date on every calendar day**. AI governance crawlers (Vertex AI, OpenAI policy scanners, Perplexity) interpret a changing date as "policy was modified today", potentially triggering unnecessary re-review workflows. The date also lost its semantic meaning — it could no longer signal when the policy was actually last changed.

**Fix applied**: Replaced `new Date()` with a static constant:
```typescript
// Update ONLY when governance policy fields actually change.
// Never use new Date() here.
const AI_TXT_LAST_UPDATED = "2026-05-13";
```
A code comment explains the invariant so future developers don't revert to `new Date()`.

---

### GAP-R2-4 (MEDIUM): REQUIRED_FIELDS Declared Types Not in ssrMeta.ts

**File**: `scripts/src/schema-validate.ts`

**Finding**: `REQUIRED_FIELDS` contained `Organization` and `NewsMediaOrganization`. Both live in the static `@graph` in `index.html`, not in `ssrMeta.ts`. The extractor only reads `ssrMeta.ts`, so these types could **never be found or validated**. Their presence created false documentation confidence ("we validate Organization") with no actual checking.

**Fix applied**: Removed `Organization` and `NewsMediaOrganization` from `REQUIRED_FIELDS`. Added a comment block explaining they live in `index.html` and should be validated via Google's Rich Results Test after production deploys.

---

### GAP-R2-5 (MEDIUM): No Warning When REQUIRED_FIELDS Type Never Found

**File**: `scripts/src/schema-validate.ts`

**Finding**: When a type was in `REQUIRED_FIELDS` but never appeared in any extracted block, the validator produced no output at all for it — no `OK`, no `FAIL`. A developer who accidentally removed a schema type from `ssrMeta.ts` would never know their validation requirement was dead code.

**Fix applied**: Added post-extraction check that warns about any `REQUIRED_FIELDS` type not found in the `seen` map after extraction:

```
WARN  The following REQUIRED_FIELDS types were declared but never found
      in any extracted block. They may have been removed from ssrMeta.ts
      or use a pattern the extractor doesn't support (add to FALLBACK_CHECKS):
        - TypeName
```

This warning does not exit non-zero (warnings only), but it makes invisible gaps visible during CI runs.

---

### GAP-R2-6 (MEDIUM): AEO Skill Had Inaccurate Schema Type Count and Validation Method Descriptions

**File**: `.agents/skills/aeo-maintenance/SKILL.md`

**Finding**: The skill stated:
- "Validates 20 schema types extracted from ssrMeta.ts" — but `REQUIRED_FIELDS` had 22 entries and only 14 were found in practice
- Described BlogPosting as the only FALLBACK_CHECK type — BreadcrumbList and 4 others were also fallback-only but not documented
- Did not distinguish between `ssrMeta.ts` types and `index.html` static types in the schema table

**Fix applied**: Updated the schema type table to show validation method for every type (`schema:check`, `schema:check (FALLBACK)`, or `Rich Results Test (manual)`). Updated the CI check description to accurately reflect the range of types validated.

---

### GAP-R2-7 (LOW): index.html Organization Schema Missing `hasOfferCatalog`

**File**: `artifacts/fintechpresshub/index.html`

**Finding**: The `NewsMediaOrganization` entity had `knowsAbout` (20 topics) but no `hasOfferCatalog`. For a service agency, `hasOfferCatalog` is a strong Knowledge Graph signal — it explicitly tells Google and AI systems what services the organisation offers, linking the entity directly to its service pages. Without it, AI systems must infer the service catalog from page content rather than from structured entity data.

**Fix applied**: Added `hasOfferCatalog` to the `@graph` `NewsMediaOrganization` entity:
```json
"hasOfferCatalog": {
  "@type": "OfferCatalog",
  "name": "Fintech SEO & Content Marketing Services",
  "url": "https://www.fintechpresshub.com/services",
  "itemListElement": [
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Fintech Content Writing", "url": "..." } },
    ... (5 services)
  ]
}
```

---

### GAP-R2-8 (LOW): llms.txt Structured Data Section Listed Incomplete Schema Inventory

**File**: `artifacts/api-server/src/routes/llmsTxt.ts`

**Finding**: The `## Structured data` section listed only 8 schema types: "Organization, WebSite, BlogPosting, FAQPage, BreadcrumbList, FinancialService, SpeakableSpecification, and SoftwareApplication". The site actually emits 19+ schema types across different page types. AI systems reading `llms.txt` to understand the site's structured data would have an incomplete picture of the entity model.

**Fix applied**: Replaced the single-sentence list with a grouped inventory organised by page category:
```
- Site-wide: NewsMediaOrganization, WebSite with SearchAction
- All pages: BreadcrumbList, WebPage
- Blog posts: BlogPosting + NewsArticle (dual-type), SpeakableSpecification, FAQPage
- Services: FinancialService + ProfessionalService (dual-type), FAQPage, HowTo
- Tools: SoftwareApplication, FAQPage
- Glossary: DefinedTerm, DefinedTermSet, CollectionPage
- Authors: ProfilePage, Person, ItemList
- Locations: LocalBusiness, FAQPage
- Compare pages: FAQPage, ItemList
- Homepage: WebPage, ItemList (services), AggregateRating, Review
```

---

## CI Status After Round 2 Fixes

```
pnpm --filter @workspace/scripts run aeo:check   → ✅  0 issues, 62 pages scanned
pnpm --filter @workspace/scripts run schema:check → ✅  19 types checked, 0 errors, 0 warnings
pnpm run typecheck                                → ✅  All 4 packages compile
```

Schema:check improvement summary:

| Metric | Before Round 2 | After Round 2 |
|--------|---------------|---------------|
| Types validated | 14 | 19 |
| Fallback checks | 1 (BlogPosting) | 6 (+ BreadcrumbList, FinancialService, NewsArticle, AggregateRating, Review) |
| Silent gaps (never-found types) | 8 | 0 |
| Extractor pattern | single-line only | single-line + multi-line |

---

## Confirmed Working AEO Signals (Live Endpoints)

All verified via `curl http://localhost:8080` against the running Express server:

| Endpoint | Status | Key Signal |
|----------|--------|------------|
| `/llms.txt` | ✅ 200 | Last-Updated from most-recent post, structured pricing, authority signals |
| `/llms-full.txt` | ✅ 200 | 15 Service FAQs, 12 Comparison FAQs, full schema inventory |
| `/.well-known/ai.txt` | ✅ 200 | Grounding-URL, ContentModel, static Last-Updated |
| `/robots.txt` | ✅ 200 | 12 AI citation bots allowed, 7 training scrapers blocked |
| `/.well-known/security.txt` | ✅ 200 | RFC 9116 compliant |
| `/sitemap_index.xml` | ✅ 200 | 6 sub-sitemaps |
| `/news-sitemap.xml` | ✅ 200 | Correct 48h window (empty when no recent posts) |
| `/sitemap-blog.xml` | ✅ 200 | Image sitemap + hreflang per entry |
| `/sitemap-pages.xml` | ✅ 200 | All static pages with lastmod |

---

## Remaining Theoretical Gaps (Cannot Fix in Code)

| Gap | What It Needs |
|-----|---------------|
| No Google News publisher approval | Submit to Google News Publisher Center |
| No verified Wikidata entry | Add Wikipedia citations with primary sources |
| No real Google Knowledge Panel | Requires external citations + brand search volume |
| `GOOGLE_SITE_VERIFICATION` env not set | Set in Hostinger with GSC verification token |
| `INDEXNOW_KEY` env not set | Set in Hostinger + submit to Bing IndexNow |
| No `Dataset` schema for tool calculators | Would improve AI discoverability of calculator outputs |

---

## Hostinger Deployment Readiness

All Round 2 changes are Hostinger-compatible:
- `AI_TXT_LAST_UPDATED` is a hardcoded string constant — no env var needed
- `hasOfferCatalog` is static JSON-LD in `index.html` — no DB dependency
- `schema-validate.ts` runs at build time only — no production runtime impact
- The AEO maintenance skill is a `.md` file — not deployed, agent-only

**Deployment command (unchanged)**:
```bash
NODE_ENV=production node artifacts/api-server/dist/index.mjs
```
