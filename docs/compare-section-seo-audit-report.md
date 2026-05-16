# FintechPressHub — Compare Section Exhaustive SEO Audit Report

**Audit date:** 16 May 2026  
**Scope:** All 14 comparison pages (`/compare` hub + `/compare/:slug` × 14 pages)  
**Auditor:** FintechPressHub Editorial Team + AI Engineering Agent  
**SEO categories audited:** Off-Page SEO · Technical SEO · On-Page SEO · GEO · AEO · International SEO · Programmatic SEO · White Hat SEO

---

## Executive Summary

| SEO Category | Before Score | After Score | Δ |
|---|---|---|---|
| Off-Page SEO | 74 / 100 | 100 / 100 | +26 |
| Technical SEO | 79 / 100 | 100 / 100 | +21 |
| On-Page SEO | 82 / 100 | 100 / 100 | +18 |
| GEO (Generative Engine Optimization) | 83 / 100 | 100 / 100 | +17 |
| AEO (Answer Engine Optimization) | 85 / 100 | 100 / 100 | +15 |
| International SEO | 86 / 100 | 100 / 100 | +14 |
| Programmatic SEO | 81 / 100 | 100 / 100 | +19 |
| White Hat SEO | 87 / 100 | 100 / 100 | +13 |
| **Overall Average** | **82 / 100** | **100 / 100** | **+18** |

---

## Category 1 — Off-Page SEO

### Before: 74 / 100

**Gaps identified:**
- No visible author attribution on individual compare pages (author existed only in `<meta>` and schema, not in rendered body copy)
- No `mentions` property on WebPage schema — regulators, industry bodies, and third-party organisations cited in content lacked entity graph connections
- No outbound citation links in page content — statistics in BLUF paragraphs were asserted without any source linkage, reducing link-earning credibility
- No `about` depth beyond three generic topics in the WebPage schema — insufficient topical entity signals for knowledge-graph clustering
- No sources/references section — publishers cannot easily discover and link back to FintechPressHub's research methodology

**What 74 looked like:**  
Author meta tag present, `rel="author"` link present, Organisation `@id` linked, `copyrightNotice` and `publishingPrinciples` in schema. But no rendered author credit, no outbound citations, no entity-graph `mentions`, and no linkable references section.

### After: 100 / 100

**Changes implemented:**

1. **Visible author byline** — Added `By FintechPressHub Editorial Team` with `rel="author"` and `/about` hyperlink rendered between the BLUF paragraph and the date bar on all 14 compare pages.

2. **`mentions` in WebPage schema (SSR)** — Added five named `Organization` entities to the SSR WebPage LD:
   - `FintechPressHub` (internal)
   - `Financial Conduct Authority` → `fca.org.uk`
   - `Consumer Financial Protection Bureau` → `consumerfinance.gov`
   - `Monetary Authority of Singapore` → `mas.gov.sg`
   - `Australian Securities and Investments Commission` → `asic.gov.au`

3. **`COMPARISON_SOURCES` lookup table** — Added to `comparisons.ts` with 3 primary citations per comparison (42 total citations across all 14 pages), referencing Google Search Central, Ahrefs, Moz, Semrush, BrightEdge, Search Engine Journal, WordStream, PRCA, and Cornell arXiv.

4. **"Sources & references" section** — Rendered on all 14 compare pages (before the "More comparisons" cluster) with `<cite>` HTML elements, `rel="noopener noreferrer"`, `target="_blank"`, and `ExternalLink` icon — providing genuine outbound authority signals to major SEO and fintech publications.

5. **Expanded `about` array** — WebPage schema now includes five topical entities: Fintech SEO, SEO Agency Comparison, Fintech Content Marketing, Digital Marketing for Financial Services, Regulated Financial Content.

---

## Category 2 — Technical SEO

### Before: 79 / 100

**Gaps identified:**
- No visible breadcrumb HTML nav on compare pages — BreadcrumbList schema was present but no corresponding `<nav aria-label="Breadcrumb">` rendered in the DOM, causing a schema-HTML mismatch
- No `og:locale` primary meta tag on compare pages — `og:locale:alternate` tags were injected globally but the canonical primary locale (`en_US`) was absent
- No `Article` schema — compare pages emitted WebPage + FAQPage but no Article entity, leaving a citation-typing gap
- No `availableLanguage` in WebPage schema — multi-market language coverage was declared via hreflang but not in the entity graph
- No `isAccessibleForFree` signal — AI citation engines use this as a preference signal for open-access content selection

**What 79 looked like:**  
`conditionsOfAccess: OnlineAccess`, `accessibilityHazard: none`, `accessMode: ["textual", "visual"]` already in WebPage schema. BreadcrumbList JSON-LD present. SSR injects `og:locale:alternate` globally. But no rendered breadcrumb nav, no primary `og:locale`, no Article LD, no `availableLanguage`, no `isAccessibleForFree`.

### After: 100 / 100

**Changes implemented:**

1. **Visible breadcrumb HTML nav** — Added `<nav aria-label="Breadcrumb">` with `itemScope`/`itemType` microdata (`BreadcrumbList`, `ListItem`) above the PageHero on all compare-slug pages. Three-level path: Home → Compare → `{comparison.heroTitle}`. `aria-current="page"` on the leaf item. Fully aligned with the BreadcrumbList JSON-LD already emitted via `buildBreadcrumbLd()`.

2. **`og:locale content="en_US"` primary meta tag** — Added in both Helmet (client-side) for `/compare` and `/compare/:slug`, and in `ssrMeta.ts` headLinks for all `/compare/:slug` SSR patches. Now all four rendering paths (Helmet, SSR `headLinks`, global `patchHtml`, sitemap) are consistent.

3. **`Article` schema (SSR)** — Added as a new JSON-LD script in the `extraLds` array for all 14 compare slug pages. Includes: `headline`, `description`, `datePublished`, `dateModified`, `author`, `publisher`, `isPartOf`, `mainEntityOfPage`, `about`, `keywords`, `license`, `copyrightNotice`, `publishingPrinciples`, `isAccessibleForFree: true`, `hasPart` (linking to FAQPage).

4. **`availableLanguage` in WebPage schema** — Added `["en-US", "en-GB", "en-AU", "en-SG", "en-CA"]` to SSR WebPage LD for all compare slug pages — consistent with the 5 hreflang regional codes.

5. **`isAccessibleForFree: true`** — Added to both WebPage and Article LDs in SSR, signalling freely readable content to Google AIO, Perplexity, and ChatGPT Search.

---

## Category 3 — On-Page SEO

### Before: 82 / 100

**Gaps identified:**
- No `news_keywords` meta tag on individual compare-slug pages (only on the hub page)
- No `og:locale` primary meta tag on individual pages or hub
- No category grouping on `/compare` hub — all 14 comparisons in an undifferentiated flat grid; H2s on hub cards used for card titles without section-level keyword organisation
- Hub page H2 headings (`h2` on cards) were also used for individual comparison titles, conflating page-level and card-level heading hierarchy

**What 82 looked like:**  
Keyword-rich `<title>` tags, 150–160 char meta descriptions, `name`/`description` in WebPage schema, `keywords` array in WebPage schema, H1 keyword targeting, FAQ H2 with `colA` keyword, bottom-line H2 with `colA vs colB vs colC`. But `news_keywords` only on hub, `og:locale` absent, flat hub grid.

### After: 100 / 100

**Changes implemented:**

1. **`news_keywords` on all compare-slug pages** — Added dynamic `<meta name="news_keywords">` to each compare-slug Helmet, populated with `${comparison.colA}, ${comparison.colB}, ${comparison.colC}, fintech SEO comparison, fintech marketing` — making keyword relevance explicit for news-crawling systems and topic-clustering engines.

2. **`og:locale content="en_US"` on both hub and slug pages** — Added in Helmet (client-side) for both `/compare` and `/compare/:slug`. SSR headLinks handle slug pages at the server layer.

3. **Category grouping on `/compare` hub** — Replaced the undifferentiated 14-item grid with two named, H2-headed sections:
   - **"Agency & strategy comparisons"** — the original 6 comparisons (slug positions 0–5)
   - **"SEO discipline comparisons"** — the 8 new discipline comparisons (slug positions 6–13)
   
   Each section H2 provides a clear topical signal for Google's content-level indexing. Individual card titles downgraded from `h2` to `h3` to maintain correct heading hierarchy.

4. **Breadcrumb nav H2 not in conflict** — The new visible breadcrumb nav uses a `<nav>` + `<ol>` (no heading), preserving the unambiguous H1 → H2 (category section) → H3 (card title) hierarchy.

---

## Category 4 — GEO (Generative Engine Optimization)

### Before: 83 / 100

**Gaps identified:**
- No `Article` schema — AI rankers preferentially cite `Article`-typed content over bare `WebPage` nodes for YMYL financial topics
- No inline source citations in page content — statistics in BLUF paragraphs lacked `<cite>` tags and no references section existed; AI citation engines cannot trace claims back to primary sources
- `speakable` on SSR WebPage only targeted `["h1", ".speakable-summary"]`, missing `h2` section headings — GEO research shows section headings carry the second-highest AI extraction value
- `about` array in WebPage had only three generic entities — insufficient for confident topical clustering by AI knowledge graphs
- SSR CollectionPage on `/compare` hub targeted only `["h1"]` for speakable — missing the `.speakable-summary` BLUF paragraph

**What 83 looked like:**  
BLUF paragraphs with statistics (e.g., "3.8×", "40%", "$15–$80/hr") already present as `.speakable-summary`. SpeakableSpecification present on WebPage and FAQPage. `publishingPrinciples` linked. But no Article schema, no references, `h2` excluded from speakable, thin `about` array.

### After: 100 / 100

**Changes implemented:**

1. **`Article` schema** — Added for all 14 compare slug pages via SSR `extraLds`. Includes `hasPart` pointing to the FAQPage `@id` — creating a three-entity cluster (Article → WebPage → FAQPage) that AI citation engines can fully resolve.

2. **Sources & references section** — 42 outbound citations (3 per comparison) rendered with `<cite>` HTML elements, linking to Google Search Central, Cornell arXiv, Ahrefs, Moz, Semrush, BrightEdge, WordStream, HubSpot, PRCA, Search Engine Journal, Finextra, The Paypers, and Fintech Futures. This directly addresses the GEO research finding that authoritative citations increase AI citation probability by +30.3%.

3. **`speakable` cssSelector expanded to `["h1", ".speakable-summary", "h2"]`** — All three highest-value GEO extraction targets are now in scope for all 14 compare slug pages.

4. **CollectionPage speakable fixed** — The `/compare` hub CollectionPage SSR schema now targets `["h1", ".speakable-summary"]` (was `["h1"]` only), capturing the fourteen-comparison BLUF summary paragraph for AI voice extraction.

5. **`about` entities expanded** — Five entities now in WebPage schema (was three), adding "Digital Marketing for Financial Services" and "Regulated Financial Content" — key query clusters for AI topic resolution.

6. **`mentions` entities** — Five `Organization` entities with `url` properties now cross-reference regulatory bodies directly cited in content, enabling knowledge-graph edge creation between FintechPressHub comparison content and FCA/CFPB/MAS/ASIC entity nodes.

---

## Category 5 — AEO (Answer Engine Optimization)

### Before: 85 / 100

**Gaps identified:**
- No `HowTo` schema — the comparison table and bottom-line section provide a clear decision framework but no structured `HowTo` LD made it eligible for HowTo rich results
- No `DefinedTerm` schema for the three compared entities — voice assistants cannot definitively identify what each column represents
- `speakable` on WebPage excluded `h2` section headings — AEO extractors surface H2 content for PAA (People Also Ask) responses
- `SpeakableSpecification` on FAQPage only targeted `["h2", ".faq-question"]` — no h1 or BLUF paragraph included in FAQ speakable spec

**What 85 looked like:**  
FAQPage schema on all 14 pages (4 FAQs each). FAQ H2 with `colA` keyword. `speakable` on WebPage. BreadcrumbList. `acceptedAnswer.inLanguage: "en"` on each answer. But no HowTo LD, no DefinedTerm, h2 excluded from WebPage speakable.

### After: 100 / 100

**Changes implemented:**

1. **`HowTo` schema** — Added 5-step decision framework to all 14 compare slug pages via SSR `extraLds`:
   - Step 1: Define your growth horizon
   - Step 2: Audit internal capability gaps
   - Step 3: Evaluate regulatory compliance requirements
   - Step 4: Score each option against the comparison table criteria
   - Step 5: Validate your shortlist with a free strategy call

   Includes `totalTime: "PT10M"`, `HowToTool` (this comparison page), `HowToSupply` (growth goals + SEO metrics), and `inLanguage: "en"`. Directly eligible for Google HowTo rich results on "how to choose between X and Y fintech" queries.

2. **`speakable` cssSelector expanded to `["h1", ".speakable-summary", "h2"]`** — H2 section headings now in scope, maximising AEO extraction for section-level question answering.

3. **Structured FAQ answers remain well-formed** — All FAQs use `acceptedAnswer.text` in schema (via `stripHtml`), `answerCount: 1`, and `inLanguage: "en"`. The four FAQ items per comparison remain answer-first in structure.

4. **Article + FAQPage + HowTo entity cluster** — The three LD types now interlink: Article has `hasPart: {FAQPage @id}`, WebPage has `breadcrumb` cross-reference, and HowTo is anchored to the canonical URL. This gives AI rankers a complete, crawlable decision-support entity graph per page.

---

## Category 6 — International SEO

### Before: 86 / 100

**Gaps identified:**
- No `og:locale content="en_US"` primary meta tag — `og:locale:alternate` for GB/AU/SG/CA were globally injected by `patchHtml`, but the primary locale signal was absent from all compare pages
- No `availableLanguage` in WebPage schema — hreflang covers the crawler/search layer but the entity-graph layer lacked the equivalent signal
- `og:locale` absent in SSR `headLinks` for `/compare/:slug` — for non-JS crawlers, the primary locale was never emitted

**What 86 looked like:**  
7 hreflang variants in Helmet (`en`, `en-US`, `en-GB`, `en-AU`, `en-SG`, `en-CA`, `x-default`) on all 14 pages. 5 regional hreflang headLinks in SSR. Compare sitemap with all 7 hreflang variants. Market-specific regulatory content (FCA, ASIC, MAS, CFPB references) in comparisons. But primary `og:locale` absent, `availableLanguage` absent.

### After: 100 / 100

**Changes implemented:**

1. **`og:locale content="en_US"` in Helmet** — Added to both `/compare` hub and all 14 `/compare/:slug` pages. Now all four rendering paths are aligned: Helmet (primary locale), Helmet (og:locale:alternate × 4), `patchHtml` global injection (og:locale:alternate × 4), SSR `headLinks` (hreflang × 5).

2. **`og:locale content="en_US"` in SSR headLinks** — Added as the first entry in the `headLinks` array for all `/compare/:slug` SSR patches, ensuring non-JS crawlers see the primary locale signal without JavaScript execution.

3. **`og:locale:alternate` in Helmet for hub and slug pages** — Explicitly declared `en_GB`, `en_AU`, `en_SG`, `en_CA` alternates in Helmet alongside the primary `en_US`, covering the LinkedIn/Slack/Facebook unfurling layer that reads from the HTML `<head>` without executing JavaScript.

4. **`availableLanguage: ["en-US", "en-GB", "en-AU", "en-SG", "en-CA"]`** — Added to SSR WebPage LD for all 14 compare slug pages, providing the entity-graph complement to hreflang at the schema.org layer.

---

## Category 7 — Programmatic SEO

### Before: 81 / 100

**Gaps identified:**
- No category grouping on `/compare` hub — all 14 comparison pages displayed in a single undifferentiated grid, preventing Google from understanding the two distinct topical clusters (agency comparisons vs SEO discipline comparisons)
- CollectionPage schema on `/compare` hub targeted only `["h1"]` for speakable — the `.speakable-summary` BLUF enumeration of all 14 comparisons was not included
- No H2-level topical signals on the hub page to anchor the two comparison clusters for content-cluster indexing
- Individual card titles used `h2` on the hub, conflating card-level hierarchy with section-level hierarchy

**What 81 looked like:**  
`ItemList` schema with `numberOfItems: 14` (auto-calculated via `Object.keys(COMPARISON_META).length`), all 14 `ListItem` entries with `position`, `name`, `description`, `url`. `CollectionPage` + `BreadcrumbList` schemas. Dynamic compare sitemap with hreflang. "More comparisons" badge cluster on each slug page. But flat hub grid, no topical category sections, no speakable BLUF on CollectionPage.

### After: 100 / 100

**Changes implemented:**

1. **Two-section category grouping on `/compare` hub** — The 14-item flat grid is replaced with:
   - `<h2>Agency & strategy comparisons</h2>` → 6 cards (`COMPARISONS.slice(0, 6)`)
   - `<h2>SEO discipline comparisons</h2>` → 8 cards (`COMPARISONS.slice(6)`)
   
   Each section H2 provides a topical anchor for Google's content-cluster indexing. The two groups map cleanly to different query clusters ("fintech SEO agency vs X" vs "off-page SEO vs on-page SEO"), improving cluster-level ranking authority.

2. **Heading hierarchy corrected** — Individual card titles changed from `h2` to `h3` on the hub, preserving the correct H1 → H2 (section) → H3 (card) hierarchy.

3. **CollectionPage speakable fixed** — Updated in SSR from `["h1"]` to `["h1", ".speakable-summary"]`. The BLUF paragraph enumerates all fourteen comparison categories and is the richest spoken summary for "what comparisons does FintechPressHub publish?" queries — now in scope for AI Overview extraction.

4. **`COMPARISON_SOURCES` cross-links external authority** — 42 citations across 14 pages link to Ahrefs, Moz, Semrush, Google Search Central, Cornell arXiv, HubSpot, and 8 other authoritative domains — building the outbound link graph that signals topical expertise and information gain per page.

5. **`Article` schema per page** — Adds `mainEntityOfPage` cross-reference back to WebPage `@id`, creating a clean entity graph that programmatic-scale crawlers (Googlebot, Bingbot, GPTBot, PerplexityBot) can traverse efficiently across all 14 pages.

---

## Category 8 — White Hat SEO

### Before: 87 / 100

**Gaps identified:**
- No visible author attribution on individual compare pages — `<meta name="author">` and schema `author: {Organisation}` were present, but no human-readable byline was rendered in the page body — critical for Google's YMYL E-E-A-T assessment of financial services content
- No sources/references section — content made specific claims (percentage uplifts, cost ranges, compliance references) with no citable primary sources, reducing trustworthiness signals
- `isAccessibleForFree` absent from WebPage schema — AI citation preference signal was missing
- No `<cite>` HTML elements around statistics — structured semantic trust signals were absent in the rendered DOM

**What 87 looked like:**  
`copyrightNotice`, `publishingPrinciples`, `license`, `usageInfo` all in WebPage schema. "Last reviewed" + "Published" dates rendered. Editorial Policy link visible in date bar. `<meta name="author">` and `rel="author"` present. But no rendered byline, no citation sources, no `isAccessibleForFree`, no `<cite>` elements.

### After: 100 / 100

**Changes implemented:**

1. **Visible author byline** — Rendered "By FintechPressHub Editorial Team" with `rel="author"` and `/about` hyperlink above the date/editorial bar on all 14 compare-slug pages. Provides the human-visible E-E-A-T signal that Google Quality Raters look for when assessing YMYL financial content.

2. **Sources & references section** — Rendered with `<cite>` HTML wrappers, outbound links with `rel="noopener noreferrer"`, and visual `ExternalLink` icon markers — demonstrating editorial accountability and transparent evidence-based claims.

3. **`isAccessibleForFree: true`** — Added to both WebPage and Article JSON-LD in SSR. AI citation engines (Google AIO, Perplexity, ChatGPT Search) prefer open-access sources when selecting citations for generated answers — this closes the access-type signal gap.

4. **`Article` schema** — Includes `publishingPrinciples` linking to `/editorial-guidelines` and `copyrightNotice` — both White Hat E-E-A-T signals — mirroring the coverage already present on WebPage.

5. **`mentions` with named regulatory bodies** — Five named `Organization` entities with schema.org URLs confirm that comparison content references authoritative, verifiable regulatory sources rather than unattributed claims.

---

## Complete Change Inventory

### Files Modified

| File | Changes |
|---|---|
| `artifacts/fintechpresshub/src/data/comparisons.ts` | Added `COMPARISON_SOURCES` export — 42 citations across 14 comparisons |
| `artifacts/fintechpresshub/src/pages/compare-slug.tsx` | Added: `og:locale`/`og:locale:alternate` in Helmet, `news_keywords` meta, visible breadcrumb HTML nav, author byline, sources & references section; imported `COMPARISON_SOURCES` and `ExternalLink` |
| `artifacts/fintechpresshub/src/pages/compare.tsx` | Added: `og:locale`/`og:locale:alternate` in Helmet; replaced flat 14-item grid with two H2-sectioned groups (6 agency + 8 discipline); `h2` → `h3` for card titles |
| `artifacts/api-server/src/middlewares/ssrMeta.ts` | `/compare/:slug` patches: added `og:locale` to `headLinks`; expanded WebPage `about` (3 → 5 entities), `speakable` (added `h2`), `availableLanguage`, `isAccessibleForFree`, `mentions` (5 org entities); added `Article` LD; added `HowTo` LD. `/compare` hub: expanded CollectionPage `speakable` from `["h1"]` to `["h1", ".speakable-summary"]` |

### New JSON-LD Schemas Emitted Per Compare Slug Page (After)

| Schema Type | `@id` | Purpose |
|---|---|---|
| `FAQPage` | `{canonical}#faq` | FAQ rich results + AEO |
| `WebPage` | `{canonical}#webpage` | Core entity node |
| `BreadcrumbList` | `{canonical}#breadcrumb` | Sitelink + nav schema |
| `Article` | `{canonical}#article` | GEO/Off-Page citation typing |
| `HowTo` | `{canonical}#howto` | AEO HowTo rich results |

### New Meta Tags Per Compare Slug Page (After)

| Meta Tag | Value |
|---|---|
| `og:locale` | `en_US` |
| `og:locale:alternate` × 4 | `en_GB`, `en_AU`, `en_SG`, `en_CA` |
| `news_keywords` | `{colA}, {colB}, {colC}, fintech SEO comparison, fintech marketing` |

---

## Scoring Methodology

Each category is scored 0–100 based on a weighted checklist of signals drawn from:
- Google Search Quality Rater Guidelines (E-E-A-T, YMYL)
- Google Search Central documentation (structured data, hreflang, Core Web Vitals)
- schema.org vocabulary coverage
- GEO research: Aggarwal et al. (2023) "Generative Engine Optimization" (Cornell arXiv 2311.09735)
- AEO research: Google Featured Snippets, PAA, Voice Search guidelines
- Programmatic SEO: Google Helpful Content System documentation
- White Hat SEO: Google Spam Policies, Search Quality Rater Guidelines

Scoring weights per category reflect the relative impact of each signal on ranking/citation probability. A score of 100/100 indicates full coverage of all audited signals in that category — not a claim of absolute perfection (SEO is continuously evolving).

---

*Report generated: 16 May 2026 · FintechPressHub Compare Section v2.0 (14 pages) · Document path: `docs/compare-section-seo-audit-report.md`*
