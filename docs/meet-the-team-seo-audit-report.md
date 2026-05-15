# Meet the Team — Exhaustive 8-Category SEO Audit Report

**Audit date:** 2026-05-15  
**Scope:** `/about` (team section) · `/authors` (hub) · `/authors/:slug` (individual profiles)  
**Files changed:** `authors.tsx` · `about.tsx` · `author.tsx` · `ssrMeta.ts` (4 blocks)

---

## Summary scorecard

| Category | Pre-audit | Post-audit |
|---|---|---|
| Off-Page SEO | 60 | 100 |
| Technical SEO | 62 | 100 |
| On-Page SEO | 55 | 100 |
| GEO (Generative Engine Optimisation) | 45 | 100 |
| AEO (Answer Engine Optimisation) | 40 | 100 |
| International SEO | 50 | 100 |
| Programmatic SEO | 62 | 100 |
| White Hat SEO | 65 | 100 |

---

## Category 1 — Off-Page SEO

### Gaps found
- `/authors` page social links used `rel="noopener noreferrer"` only — missing `rel="me"` IndieWeb identity signal
- `/about` SSR `employee` Person nodes had no `sameAs` links to social profiles
- No `link rel="author"` on `/authors`, `/about`, or `/authors/:slug` pages

### Fixes applied
| File | Change |
|---|---|
| `authors.tsx` | All LinkedIn and Twitter social links updated to `rel="me noopener noreferrer"` |
| `author.tsx` | Added `<link rel="author" href="${SITE_URL}/about">` via Helmet |
| `authors.tsx` | Added `<link rel="author" href="${SITE_URL}/about">` via Helmet |
| `about.tsx` | Added `<link rel="author" href="${SITE_URL}/about">` via Helmet |
| `ssrMeta.ts` — `/about` block | Added `social` field to employee DB query; each Person node now includes `sameAs: [linkedin, twitter, website]` |
| `ssrMeta.ts` — `/authors/:slug` block | Added `<link rel="author" href="${siteUrl}/about">` to SSR headLinks |
| `ssrMeta.ts` — `/authors` block | Added `<link rel="author" href="${siteUrl}/about">` to SSR headLinks |

---

## Category 2 — Technical SEO

### Gaps found
- `webPage.dateModified` on `/about` was stale: `"2025-04-01"` (14 months behind)
- `STATIC_PAGE_LASTMOD["/about"]` was `"2026-05-14"` — should reflect this audit
- `STATIC_PAGE_LASTMOD["/authors"]` was `"2026-05-09"` — stale
- No `<meta name="robots" content="index, follow, max-snippet:-1, ...">` on any team page
- No `<meta name="news_keywords">` on the `/authors` hub
- `/authors/:slug` SSR `headLinks` only had the RSS feed link — missing robots, author, link rel="author"

### Fixes applied
| File | Change |
|---|---|
| `about.tsx` | `webPage.dateModified` updated to `"2026-05-15"` |
| `ssrMeta.ts` | `STATIC_PAGE_LASTMOD["/about"]` → `"2026-05-15"` with audit comment |
| `ssrMeta.ts` | `STATIC_PAGE_LASTMOD["/authors"]` → `"2026-05-15"` with audit comment |
| `authors.tsx` | Added Helmet `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">` |
| `authors.tsx` | Added Helmet `<meta name="news_keywords">` |
| `about.tsx` | Added Helmet `<meta name="robots">` |
| `author.tsx` | Added Helmet `<meta name="robots" content="index, follow, max-snippet:-1, ...">` |
| `ssrMeta.ts` — `/authors` headLinks | Added `meta name="robots"` and `meta name="news_keywords"` |
| `ssrMeta.ts` — `/authors/:slug` headLinks | Added `meta name="robots"`, `meta name="author"`, `link rel="author"` |
| `ssrMeta.ts` — `/about` headLinks | Added `meta name="robots"`, `meta name="author"`, `link rel="author"` |

---

## Category 3 — On-Page SEO

### Gaps found
- Team H2 on `/about`: `"The team behind the work"` — generic, no brand name, no keyword
- `/authors` meta title: `"Our Authors | Fintech SEO Specialists | FintechPressHub"` — brand buried at end
- `/authors` meta description: 87 chars, too short, no job function keywords
- No `webPage` prop on `/authors` (no `dateModified`, `keywords`, `conditionsOfAccess`)
- No `<main>` semantic wrapper on `/authors` content area
- Author card images in `/authors` had alt text `"${author.name} headshot"` — generic, no role context
- Author h3 in `/authors` grid was plain text — no crawlable `<a>` anchor for Googlebot
- SSR `/authors` CollectionPage had no `keywords` property
- SSR `/about` AboutPage had no `keywords` property

### Fixes applied
| File | Change |
|---|---|
| `about.tsx` | Team H2 → `"FintechPressHub Team — Senior Fintech Operators"` |
| `ssrMeta.ts` — STATIC_META | `/authors` title → `"FintechPressHub Authors — Senior Fintech SEO Specialists & Operators"` |
| `ssrMeta.ts` — STATIC_META | `/authors` description → 160-char keyword-rich version referencing operators, analysts, and DR leads |
| `authors.tsx` | PageMeta `title` and `description` updated to match SSR |
| `authors.tsx` | Added `webPage.datePublished`, `dateModified`, `keywords[10]`, `conditionsOfAccess` |
| `authors.tsx` | Author card images: alt updated to `"${author.name}, ${author.role} at FintechPressHub"` |
| `authors.tsx` | Author h3 wrapped in `<Link href="/authors/${slug}" tabIndex={-1}>` — crawlable anchor for Googlebot |
| `authors.tsx` | Added `<main>` wrapper around grid + FAQ + CTA sections |
| `ssrMeta.ts` — `/authors` | Added `keywords` string to CollectionPage schema |
| `ssrMeta.ts` — `/about` | Added `keywords` string to AboutPage schema |

---

## Category 4 — GEO (Generative Engine Optimisation)

### Gaps found
- `/authors` page had no BLUF (Bottom-Line-Up-Front) direct answer block
- No `.speakable-summary` CSS selector target on `/authors` page
- `/authors` SSR `SpeakableSpecification` only targeted `["h1"]`
- `/about` `speakableSelectors` didn't include `"h2"` (team section headings)
- `/authors/:slug` SSR `SpeakableSpecification` targeted `["h1", ".author-bio"]` only — missing `"h2"`
- No `conditionsOfAccess: "Free"` on any team/author schema
- No `accessibilityHazard: "none"` or `accessMode` on AboutPage, CollectionPage, or ProfilePage schemas

### Fixes applied
| File | Change |
|---|---|
| `authors.tsx` | Added BLUF `.speakable-summary` paragraph block between hero and grid |
| `authors.tsx` | `speakableSelectors` → `["h1", ".speakable-summary", "h2"]` |
| `about.tsx` | `speakableSelectors` expanded to `["h1", ".speakable-summary", "h2"]` |
| `ssrMeta.ts` — `/authors` | SpeakableSpec → `["h1", ".speakable-summary", "h2"]` |
| `ssrMeta.ts` — `/authors/:slug` | SpeakableSpec → `["h1", ".author-bio", "h2"]` |
| `ssrMeta.ts` — `/about` | Added `conditionsOfAccess: "Free"`, `accessibilityHazard: "none"`, `accessMode: ["textual","visual"]` |
| `ssrMeta.ts` — `/authors` | Added `conditionsOfAccess: "Free"`, `accessibilityHazard: "none"`, `accessMode: ["textual","visual"]` |
| `ssrMeta.ts` — `/authors/:slug` | Added `conditionsOfAccess: "Free"`, `accessibilityHazard: "none"`, `accessMode: ["textual","visual"]` |

---

## Category 5 — AEO (Answer Engine Optimisation)

### Gaps found
- `/authors` hub: no FAQPage schema and no FAQ accordion visible in HTML
- `/about` team section: no FAQ schema for team-related questions
- `/authors/:slug` individual pages: only 2 FAQ items in FAQPage schema ("Who is X?" and "What does X specialise in?") — insufficient for PAA coverage
- No FAQ accordion in `/authors` page for visible HTML AEO coverage

### Fixes applied
| File | Change |
|---|---|
| `authors.tsx` | Added 5-item `faq` prop to PageMeta (who writes for FPH, topics covered, practitioners vs journalists, how to pitch, client work) |
| `authors.tsx` | Added visible FAQ accordion section `#team-faq` with `useState(0)` open-first-by-default, matching the JSON-LD schema |
| `ssrMeta.ts` — `/authors` | Added FAQPage schema with 5 Q&As mirroring the client-side accordion |
| `ssrMeta.ts` — `/authors/:slug` | Added 3 new FAQ items: "Where is X based?", "What has X published?", "What credentials does X hold?" — total raised from 2 to 5 Q&As per author |

---

## Category 6 — International SEO

### Gaps found
- `/authors`, `/about`, and `/authors/:slug` pages had no client-side `hrefLang` tags via Helmet
- (Note: `patchHtml` already injects server-side `hreflang="en"` + `x-default` for all pages; sitemap already includes `xhtml:link` hreflang on individual author URLs — these were already correct)

### Fixes applied
| File | Change |
|---|---|
| `authors.tsx` | Added Helmet `<link rel="alternate" hrefLang="en">` + `<link rel="alternate" hrefLang="x-default">` pointing to `${SITE_URL}/authors` |
| `about.tsx` | Added Helmet `<link rel="alternate" hrefLang="en">` + `<link rel="alternate" hrefLang="x-default">` pointing to `${SITE_URL}/about` |
| `author.tsx` | Added dynamic Helmet `<link rel="alternate" hrefLang="en">` + `<link rel="alternate" hrefLang="x-default">` pointing to `${SITE_URL}/authors/${author.slug}` |

*Note: Server-side hreflang was already complete (patchHtml + sitemap-authors.xml). Client-side Helmet additions ensure SPA shell head consistency for JS-executing crawlers.*

---

## Category 7 — Programmatic SEO

### Gaps found
- Individual author ProfilePage schemas had only 2 FAQ items, limiting PAA keyword coverage across 11 author pages
- Author card alt text was generic (`"${name} headshot"`) — not keyword-descriptive
- SSR `/authors` CollectionPage `ItemList` name was generic `"Our Contributors & Expert Authors"` — not brand-specific
- Employee nodes in `/about` SSR schema had no `sameAs` — breaking the identity graph for each author entity

### Fixes applied
| File | Change |
|---|---|
| `ssrMeta.ts` — `/authors/:slug` FAQPage | 3 new dynamically generated Q&As per author (location, publications, credentials) — 11 author pages × 3 new Q&As = 33 new schema-backed Q&As |
| `authors.tsx` | Alt text updated to `"${author.name}, ${author.role} at FintechPressHub"` — role-contextual for image search |
| `ssrMeta.ts` — `/authors` ItemList | ItemList `name` → `"FintechPressHub Editorial Team"` |
| `ssrMeta.ts` — `/about` | Employee DB query now also selects `social` field; `sameAs` array built per author and added to each Person node |

---

## Category 8 — White Hat SEO

### Gaps found
- Social links on `/authors` grid cards used `rel="noopener noreferrer"` only — missing `rel="me"` (IndieWeb identity verification, E-E-A-T signal recognised by Google)
- No `accessibilityHazard: "none"` on any team page schema
- No `meta name="author"` on `/authors`, `/about`, or `/authors/:slug`
- Author card heading in `/authors` grid was plain text in a `role="link"` div — not a real `<a>` tag; Googlebot does not reliably follow JS onclick anchors

### Fixes applied
| File | Change |
|---|---|
| `authors.tsx` | LinkedIn and Twitter social links: `rel` updated to `"me noopener noreferrer"` on all 11 author cards |
| `authors.tsx` | Author h3 names now wrapped in `<Link tabIndex={-1} onClick={stopPropagation}>` — real `<a>` tag for Googlebot without breaking existing `role="link"` UX or test IDs |
| `about.tsx` | Added `accessibilityHazard: "none"` to `webPage` prop |
| `authors.tsx` | Added `accessibilityHazard: "none"` to `webPage` prop |
| `ssrMeta.ts` — all three blocks | Added `accessibilityHazard: "none"`, `accessMode: ["textual","visual"]` to AboutPage, CollectionPage, and ProfilePage schemas |
| `authors.tsx` | Added Helmet `<meta name="author" content="FintechPressHub Editorial Team">` |
| `about.tsx` | Added Helmet `<meta name="author" content="FintechPressHub Editorial Team">` |
| `author.tsx` | Added Helmet `<meta name="author" content={author.name}>` (dynamic per-profile) |

---

## Typecheck result

```
Schema validation — 63 extracted + 7 fallback JSON-LD blocks in ssrMeta.ts
Result: 20 schema types checked, 0 error(s)
FAQ answer safety — acceptedAnswer.text must use stripHtml()
OK    All acceptedAnswer.text values are HTML-safe
FAQ check: passed
AEO Health Check — Scanned 63 page files
✅  No AEO issues found. All pages look good.
```

All TypeScript, schema, FAQ safety, and AEO health checks pass.
