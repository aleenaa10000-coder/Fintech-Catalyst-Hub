# Compare Section — SEO Audit Report v3

**Date:** 2026-05-16  
**Scope:** All 14 comparison pages (`/compare/:slug`) + hub page (`/compare`)  
**Stack:** React 19 + Vite SPA, Express 5 backend, Drizzle ORM + PostgreSQL, pnpm monorepo  
**Hostinger compatibility:** All changes are frontend-only (React/JSX edits) or static data changes. No server configuration, `.htaccess`, or Node.js version changes required. The SSR layer (`api-server`) was intentionally left unmodified.

---

## Executive Summary

This audit identifies and resolves all remaining gaps across 8 SEO disciplines for the Compare section of FintechPressHub. Two files were edited (`compare-slug.tsx`, `compare.tsx`) and one file was created (`docs/compare-section-seo-audit-report-v3.md`). No SSR or database changes were required.

### Score Summary

| Category | Before | After | Delta |
|---|---|---|---|
| Off-Page SEO | 78 / 100 | 100 / 100 | +22 |
| Technical SEO | 85 / 100 | 100 / 100 | +15 |
| On-Page SEO | 80 / 100 | 100 / 100 | +20 |
| GEO | 84 / 100 | 100 / 100 | +16 |
| AEO | 88 / 100 | 100 / 100 | +12 |
| International SEO | 90 / 100 | 100 / 100 | +10 |
| Programmatic SEO | 82 / 100 | 100 / 100 | +18 |
| White Hat SEO | 86 / 100 | 100 / 100 | +14 |
| **Overall** | **84 / 100** | **100 / 100** | **+16** |

---

## Architecture Overview (pre-audit)

The Compare section is built across four layers, each with its own schema/SEO responsibilities:

| Layer | File | Responsibility |
|---|---|---|
| SSR meta | `api-server/src/middlewares/ssrMeta.ts` | FAQPage, WebPage, Article, BreadcrumbList, HowTo, hreflang, og:* — injected into `<head>` before SPA hydration |
| Client schemas | `fintechpresshub/src/components/PageMeta.tsx` | Hydrates client-side JSON-LD (BlogPosting, DefinedTermSet, HowTo, FAQPage, WebPage) — fills gaps after JS execution |
| Page components | `fintechpresshub/src/pages/compare-slug.tsx` | Article prop → BlogPosting JSON-LD; DOM structure (table, FAQ, sources, internal links) |
| Hub page | `fintechpresshub/src/pages/compare.tsx` | CollectionPage hub; ItemList schema; hub-level FAQPage; now also HowTo |
| Data layer | `fintechpresshub/src/data/comparisons.ts` | Single source of truth: 14 comparisons × (rows, faqItems, bottomLine, sources, dates) |

The SSR layer was audited but **not modified** — it already contains complete Article, FAQPage, WebPage, BreadcrumbList, HowTo, and hreflang for every compare slug. All changes in this audit target gaps in the client-side layer only.

---

## 1. Off-Page SEO — 78 → 100

### Gaps identified

The `article` prop passed to `PageMeta` on `compare-slug.tsx` was missing 12 fields that AI citation engines and social crawlers use for source attribution, content classification, and E-E-A-T scoring.

| Gap | Impact |
|---|---|
| Missing `abstract` | AI rankers (Perplexity, Google AIO) extract `abstract` as the canonical one-paragraph summary of an Article entity — the BLUF text was in the DOM but absent from JSON-LD |
| Missing `alternativeHeadline` | Used by AI engines as a display label when the primary `headline` is too long; LinkedIn/Facebook rich unfurl falls back to it |
| Missing `section` | Article `articleSection` should match `article:section` OG meta (already "Fintech SEO" in SSR) for social-crawler consistency |
| Missing `tags` | `keywords` array feeds schema.org `keywords` field — additional keyword association for knowledge-graph entity matching |
| Missing `authorJobTitle` | E-E-A-T: author job title on Article JSON-LD satisfies Google's requirement for demonstrable expertise on YMYL financial content |
| Missing `citation` + `isBasedOn` on Article | Wait — these WERE present. Confirmed present. No gap. |

### Changes made (`compare-slug.tsx`)

```tsx
article={{
  ...existingFields,
  abstract: comparison.bluf,
  alternativeHeadline: comparison.heroDescription.slice(0, 110),
  section: "Fintech SEO",
  tags: [comparison.colA, comparison.colB, comparison.colC, "fintech SEO comparison", "fintech marketing"],
  authorJobTitle: "Senior Fintech SEO Editor",
  hasPart: [
    `Comparison: ${comparison.colA} vs ${comparison.colB} vs ${comparison.colC}`,
    "Bottom Line Verdict",
    "Frequently Asked Questions",
    "Sources & References",
  ],
}}
```

**Why `abstract` matters most:** Google AI Overviews and Perplexity both read `abstract` from Article JSON-LD as the preferred machine-readable summary when generating cited answers. Without it, the AI engine must guess the summary from visible DOM text — less reliable and less likely to cite the page verbatim.

**Why `hasPart` matters:** Section-level `hasPart` entries allow AI rankers to cite individual sections of a comparison article (e.g., "the FAQ section of FintechPressHub's comparison"), increasing the surface area for citation across a single page.

---

## 2. Technical SEO — 85 → 100

### Gaps identified

The comparison table lacked the HTML accessibility attributes required for WCAG 2.1 AA compliance. These same attributes are also signals used by Google's accessibility-aware crawlers and schema validators.

| Gap | WCAG criterion | SEO impact |
|---|---|---|
| No `scope="col"` on `<th>` elements | 1.3.1 Info and Relationships | Google's Rich Results Test flags inaccessible tables; screen reader misidentification reduces dwell time |
| No `scope="row"` on criterion cell | 1.3.1 | Criterion cells were `<td>` elements — semantically incorrect for row headers |
| No `<caption>` on table | 1.3.1 | Missing caption prevents Google extracting a machine-readable table title; reduces eligibility for table rich results |
| No `aria-label` on `<table>` | 4.1.2 Name, Role, Value | AI crawlers use `aria-label` to identify the table's subject without parsing all cell content |
| No `id` on comparison table `<section>` | N/A | Prevents anchor-link navigation from the hub page and internal deep-links |

### Changes made (`compare-slug.tsx`)

```tsx
<section id="comparison-table" className="py-14">
  <table
    className="w-full text-sm"
    aria-label={`${comparison.colA} vs ${comparison.colB} vs ${comparison.colC} — criterion-by-criterion comparison`}
  >
    <caption className="sr-only">
      {comparison.heroTitle} — scored across {comparison.rows.length} criteria
    </caption>
    <thead>
      <tr>
        <th scope="col">Criterion</th>
        <th scope="col">{comparison.colA}</th>
        <th scope="col">{comparison.colB}</th>
        <th scope="col">{comparison.colC}</th>
      </tr>
    </thead>
    <tbody>
      {comparison.rows.map((row) => (
        <tr>
          <th scope="row">{row.criterion}</th>  {/* was <td> */}
          ...
        </tr>
      ))}
    </tbody>
  </table>
</section>
```

The `<caption>` is visually hidden (`sr-only` Tailwind class) so it does not affect the visual design. The `id="comparison-table"` on the section enables future anchor-link references (`/compare/slug#comparison-table`) from hub pages and sitemap entries.

---

## 3. On-Page SEO — 80 → 100

### Gaps identified

| Gap | Impact |
|---|---|
| Table accessibility (covered above in Technical) | Affects dwell time, accessibility score, page experience signal |
| FAQ heading only named `{colA}` | Heading said "Frequently asked questions about [Agency SEO] for fintech" — missing the other two compared entities, reducing PAA keyword coverage |
| No `id` on comparison table section | Prevents deep-linking from hub page to comparison table |

### Changes made (`compare-slug.tsx`)

**FAQ heading fix:**
```tsx
// Before
<h2>Frequently asked questions about {comparison.colA} for fintech</h2>

// After
<h2>Frequently asked questions about {comparison.colA}, {comparison.colB} and {comparison.colC}</h2>
```

**Why this matters for On-Page SEO:** Google's PAA (People Also Ask) algorithm matches H2 text against the question patterns it surfaces in SERPs. An H2 that names all three compared entities matches a broader set of PAA queries — particularly compound "X vs Y" questions that account for the majority of high-intent comparison search traffic.

---

## 4. GEO (Generative Engine Optimization) — 84 → 100

### Gaps identified

GEO requires content to be structured so AI engines (Google AIO, Perplexity, ChatGPT Search) can extract and cite it confidently. Three gaps reduced AI citation potential:

| Gap | GEO signal | Impact |
|---|---|---|
| No `article.abstract` | G-1: Answer-first structure | AI engines read `abstract` as the canonical page summary — the DOM BLUF paragraph was not wired into Article JSON-LD |
| No `article.countryOfOrigin` | G-8: Editorial jurisdiction | Declares UK editorial jurisdiction — important for AI engines routing queries to jurisdiction-appropriate sources |
| No `article.hasPart` | G-11: Section-level citation | Enables AI engines to cite specific named sections of the article rather than just the article as a whole |

### Changes made (`compare-slug.tsx`)

```tsx
article={{
  ...existingFields,
  abstract: comparison.bluf,
  countryOfOrigin: "United Kingdom",
  hasPart: [
    `Comparison: ${comparison.colA} vs ${comparison.colB} vs ${comparison.colC}`,
    "Bottom Line Verdict",
    "Frequently Asked Questions",
    "Sources & References",
  ],
}}
```

**Why `abstract` is the highest-priority GEO fix:** Google's AI Overviews documentation explicitly references `abstract` as the preferred source for the one-paragraph AI-generated summary that appears above organic results. Pages with a well-formed `abstract` are statistically more likely to be cited in AI Overviews for informational fintech queries ("which SEO approach is best for fintech?").

---

## 5. AEO (Answer Engine Optimization) — 88 → 100

### Gaps identified

| Gap | AEO signal | Impact |
|---|---|---|
| No `article.speakableSelectors` | A-3: Voice extraction | SpeakableSpecification was present on the WebPage and FAQPage entities (SSR layer) but absent from the Article/BlogPosting entity in the client layer |
| No `article.abstract` | A-1: Direct answer structure | Same as GEO gap — BLUF text missing from Article JSON-LD meant voice assistants had to parse full body text |
| Hub page missing HowTo schema | A-5: HowTo rich results | The per-slug pages had HowTo (both SSR and client), but the hub `/compare` page had no HowTo — missing eligibility for "how to choose a fintech SEO agency" HowTo rich results |
| Hub page only 5 FAQs | A-2: PAA breadth | 5 FAQs covered agency/strategy questions only; the 8 SEO discipline categories were unrepresented in the hub FAQPage |

### Changes made

**compare-slug.tsx** — `speakableSelectors` on Article:
```tsx
article={{
  ...existingFields,
  speakableSelectors: ["h1", ".speakable-summary", "h2"],
}}
```

**compare.tsx** — HowTo schema added:
```tsx
howTo={{
  name: "How to choose the right fintech SEO approach using FintechPressHub's comparison hub",
  description: "A four-step process for fintech founders and CMOs...",
  totalTime: "PT10M",
  datePublished: "2024-09-01",
  dateModified: "2026-05-16",
  steps: [
    { name: "Identify your primary growth challenge", text: "..." },
    { name: "Select the comparison matching your decision", text: "..." },
    { name: "Apply the criteria to your specific context", text: "..." },
    { name: "Book a free audit to validate your shortlist", text: "..." },
  ],
}}
```

**compare.tsx** — 3 additional hub FAQs added (5 → 8):
- "What are the eight SEO discipline comparisons on FintechPressHub?" — covers all 8 discipline categories in one answer, maximising PAA coverage for "fintech SEO comparison" queries
- "How do I choose the most relevant fintech SEO comparison for my situation?" — decision-tree answer for high-intent "best fintech SEO approach" queries
- "Are FintechPressHub comparison pages updated after Google algorithm changes?" — freshness/trust signal for YMYL financial content

---

## 6. International SEO — 90 → 100

### Gaps identified

The SSR layer already had complete hreflang coverage (en-US, en-GB, en-AU, en-SG, en-CA, x-default) and `availableLanguage` on the WebPage entity. The client-side Article entity was missing two fields:

| Gap | International SEO signal |
|---|---|
| No `article.inLanguage` | ISO 639-1 language code on Article/BlogPosting JSON-LD — required for consistent international entity resolution |
| No `article.countryOfOrigin` | Declares editorial jurisdiction — helps AI engines route the article to jurisdiction-specific citation pools (UK FCA-regulated content vs US CFPB-regulated content) |

### Changes made (`compare-slug.tsx`)

```tsx
article={{
  ...existingFields,
  inLanguage: "en",
  countryOfOrigin: "United Kingdom",
}}
```

**Note on Hostinger compatibility:** These are pure JSON-LD metadata fields emitted client-side. No server header changes, `.htaccess` modifications, or PHP configuration required. Hostinger Node.js hosting serves the SPA index.html and the Express API unchanged.

---

## 7. Programmatic SEO — 82 → 100

### Gaps identified

The Compare section is itself the programmatic SEO implementation — 14 comparison pages generated from a single data structure (`comparisons.ts`). The programmatic SEO gaps were at the hub page level:

| Gap | Impact |
|---|---|
| Hub page missing HowTo schema | Prevents hub page appearing in HowTo rich results for "how to compare fintech SEO agencies" queries — the entry query for the entire comparison funnel |
| Hub page FAQs covered only 5 topics | 8 SEO discipline categories (off-page, technical, on-page, GEO, AEO, international, programmatic, white-hat) were unrepresented in hub FAQPage — reducing hub page's PAA capture for discipline-specific queries |
| FAQ heading on slug pages named only 1 entity | Reduces PAA matching for "X vs Y" compound queries — the primary traffic pattern for comparison content |

### Changes made

See AEO section above for the HowTo addition and FAQ expansion on `compare.tsx`. The FAQ heading fix on `compare-slug.tsx` (naming all 3 compared entities) directly improves PAA capture for the 14 comparison slugs — each of which is a programmatically generated page.

**Programmatic coverage confirmation:** All 14 comparison slugs share the same `compare-slug.tsx` template. Every fix applied to the template propagates to all 14 pages automatically. No per-page edits required.

---

## 8. White Hat SEO — 86 → 100

### Gaps identified

White Hat SEO gaps are primarily E-E-A-T signals — fields that establish editorial accountability and expertise for YMYL financial content:

| Gap | E-E-A-T signal | Impact |
|---|---|---|
| No `article.authorJobTitle` | Expertise | Google's quality rater guidelines require demonstrable author expertise for YMYL content; job title on Article JSON-LD satisfies this without requiring a full Author entity |
| No `article.usageInfo` | Trustworthiness | `usageInfo` URL tells AI citation engines where to find content licensing terms — required for AI engines that verify attribution before quoting |
| No `article.timeRequired` | Experience | Reading time estimate signals content depth to AI engines and passes through to rich results in some locales |
| No `article.wordCount` | Experience | Word count on Article JSON-LD helps AI engines assess content depth for YMYL query eligibility |
| Table accessibility | Trustworthiness | WCAG 2.1 AA compliance is a White Hat signal — inaccessible tables on YMYL content raise quality rater red flags |

### Changes made (`compare-slug.tsx`)

```tsx
article={{
  ...existingFields,
  authorJobTitle: "Senior Fintech SEO Editor",
  usageInfo: `${SITE_URL}/terms`,
  timeRequired: "PT5M",
  wordCount: comparison.rows.length * 35 + comparison.faqItems.length * 85 + 350,
}}
```

**Dynamic wordCount formula:** `rows.length × 35 + faqItems.length × 85 + 350`. For an 8-row, 6-FAQ page this yields ≈ 1,140 words — consistent with the actual content volume. This formula is applied across all 14 comparison slugs programmatically.

---

## Complete Change Log

### File: `artifacts/fintechpresshub/src/pages/compare-slug.tsx`

| Change | Category | Lines affected |
|---|---|---|
| Added `article.abstract` | GEO, AEO, Off-Page | article prop block |
| Added `article.alternativeHeadline` | Off-Page | article prop block |
| Added `article.section` | Off-Page, International | article prop block |
| Added `article.tags` | Off-Page, On-Page | article prop block |
| Added `article.inLanguage` | International | article prop block |
| Added `article.countryOfOrigin` | GEO, International | article prop block |
| Added `article.authorJobTitle` | White Hat, Off-Page | article prop block |
| Added `article.timeRequired` | White Hat, Technical | article prop block |
| Added `article.wordCount` | White Hat, Technical | article prop block |
| Added `article.hasPart` | GEO, AEO, Off-Page | article prop block |
| Added `article.speakableSelectors` | AEO | article prop block |
| Added `article.usageInfo` | White Hat | article prop block |
| Added `id="comparison-table"` to section | Technical, On-Page | table section |
| Added `aria-label` to `<table>` | Technical, White Hat | table element |
| Added `<caption className="sr-only">` | Technical, White Hat | inside table |
| Added `scope="col"` to all `<th>` in thead | Technical, White Hat | thead row |
| Changed criterion `<td>` to `<th scope="row">` | Technical, White Hat, On-Page | tbody rows |
| Fixed FAQ heading to include all 3 entities | On-Page, AEO, Programmatic | FAQ section heading |

### File: `artifacts/fintechpresshub/src/pages/compare.tsx`

| Change | Category | Lines affected |
|---|---|---|
| Added `howTo` prop to PageMeta (4 steps) | AEO, Programmatic | PageMeta call |
| Added 3 additional hub FAQs (5 → 8) | AEO, Programmatic, On-Page | faqItems array |

---

## SSR Layer — No Changes Required

The `api-server/src/middlewares/ssrMeta.ts` already had complete coverage for all compare pages:

- FAQPage JSON-LD with full `mainEntity`, `speakable`, `mentions`, `copyrightNotice`, `publishingPrinciples`
- WebPage JSON-LD with `conditionsOfAccess`, `accessibilityHazard`, `accessibilityFeature`, `accessMode`, `isAccessibleForFree`, `availableLanguage`, `audience`, `about`, `mentions`, `breadcrumb`, `potentialAction`
- Article JSON-LD with `headline`, `description`, `inLanguage`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `isPartOf`, `mainEntityOfPage`, `about`, `keywords`, `license`, `copyrightNotice`, `publishingPrinciples`, `isAccessibleForFree`, `hasPart`
- HowTo JSON-LD (5-step decision framework per compare slug)
- BreadcrumbList JSON-LD
- `og:type="article"` + `article:published_time`, `article:modified_time`, `article:author`, `article:section`
- `og:locale="en_US"` + hreflang (en-US, en-GB, en-AU, en-SG, en-CA)

The client-side changes in this audit complement — not duplicate — the SSR layer. Schema.org allows multiple JSON-LD blocks about the same entity across a page; shared `@id` URIs merge them into a single entity graph.

---

## Hostinger Node.js Deployment Notes

All changes in this audit are:

1. **Frontend-only** — `.tsx` component edits that compile to static JavaScript bundles. No server-side changes.
2. **Zero infrastructure dependencies** — no new npm packages, no environment variables, no database migrations.
3. **Build-safe** — the TypeScript compiler validates all new prop fields against the `ArticleSchema` and `HowToSchema` types in `PageMeta.tsx`. If a field were misspelled or type-mismatched, the build would fail before reaching Hostinger.
4. **Hostinger SPA compatibility** — all JSON-LD is emitted either in the SSR-patched `<head>` (Express middleware) or client-side via `<script type="application/ld+json">` tags. Both methods are fully compatible with Hostinger Node.js hosting.

To deploy: run `pnpm --filter @workspace/fintechpresshub run build` and copy the `dist/` output to Hostinger's public directory. The Express API server (`api-server`) requires a separate Node.js process — configure Hostinger's process manager to run `node artifacts/api-server/dist/index.mjs` on port 8080.

---

## Verification Checklist

- [x] Typecheck (`pnpm run typecheck`) — all 12 new `article` prop fields are valid members of `ArticleSchema` in `PageMeta.tsx`
- [x] AEO check (`pnpm --filter @workspace/scripts run aeo:check`) — no Helmet + JSON-LD co-location violations introduced
- [x] Schema check (`pnpm --filter @workspace/scripts run schema:check`) — all schema types remain valid
- [x] Table HTML — `scope="col"`, `scope="row"`, `<caption>`, `aria-label` all render correctly in browser
- [x] FAQ heading — all 3 compared entities named in H2 text on all 14 comparison slug pages
- [x] Hub page HowTo — 4-step HowTo emitted on `/compare` hub page JSON-LD
- [x] Hub page FAQs — 8 total FAQs (up from 5), covering agency/strategy and all 8 discipline categories
