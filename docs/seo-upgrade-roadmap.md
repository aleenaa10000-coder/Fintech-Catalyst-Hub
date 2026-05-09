# FintechPressHub — Comprehensive SEO Upgrade Roadmap

**Prepared:** May 2026  
**Target deployment:** Hostinger Node.js Business Plan  
**Architecture:** React SPA (Vite) + Express backend (Node.js) + PostgreSQL (Drizzle ORM)

---

## How to Read This Document

Each item carries:
- **ID** — matches the audit table (T = Technical, O = On-Page, F = Off-Page, G = GEO, A = AEO, I = International, P = Programmatic, W = White Hat)
- **Est. hours** — realistic engineering time including testing
- **Impact** — 🔴 Critical · 🟡 Medium · 🟢 Low
- **Files** — primary files touched
- **Skill** — the Agent Skill created or reused for this item (all 8 live in `/.agents/skills/`)
- **Dependency** — items that must ship first

> **Total estimated effort: ~145 hours across 4 × 2-week sprints (~8 weeks)**

---

## Architecture Note (Read First)

The single biggest SEO lever in this project is rendering full HTML before delivery.  
Currently every public page (`/`, `/blog/:slug`, `/services/:slug`, `/tools/*`, `/authors/:slug`) is **client-side rendered**. Googlebot sees only the `index.html` shell. A `prerender.mjs` script is referenced in the build process but the file does not exist in the repository.

**Sprint 1 begins with rebuilding this pipeline.** Every other on-page improvement depends on it shipping first.

---

## Sprint 1 — Foundation & Quick Wins (Weeks 1–2)

**Goal:** Close the critical gaps that are actively blocking rankings. Establish all 8 Agent Skills. Estimated total: **~42 hours**.

---

### T1 · Rebuild the prerender pipeline `seo-technical-prerender` · 🔴 Critical

**Est: 6h** | Depends on: nothing | **Blocks: O1, O5, P4**

The build script calls `node scripts/prerender.mjs` but this file is missing. Without it, every public page ships as a blank `<div id="root">` to crawlers.

**What to build:**
- Write `artifacts/fintechpresshub/scripts/prerender.mjs` using Puppeteer (headless Chrome) or `@prerenderer/renderer-puppeteer`
- Crawl all static routes: `/`, `/about`, `/services`, `/pricing`, `/blog`, `/contact`, `/tools`, `/tools/*`, `/write-for-us`, `/editorial-guidelines`
- Crawl all dynamic routes by fetching slugs from the running API: `/blog/:slug`, `/authors/:slug`, `/services/:slug`
- Write pre-rendered HTML files to `dist/public/` matching the URL path (e.g. `dist/public/blog/my-slug/index.html`)
- Configure Express to check for a matching pre-rendered file before falling back to `index.html` in production

**Files:**
```
artifacts/fintechpresshub/scripts/prerender.mjs          ← create
artifacts/api-server/src/app.ts                          ← update static serving logic
artifacts/fintechpresshub/package.json                   ← confirm build script order
```

**Acceptance test:**
```bash
curl -s https://www.fintechpresshub.com/blog/how-fintech-companies-can-win | grep "<h1"
# Must return the H1 text, not an empty result
```

---

### T3 · www → non-www 301 redirect middleware `seo-technical-headers` · 🔴 High

**Est: 0.5h** | Depends on: nothing

`index.html` and the sitemap both use `https://www.fintechpresshub.com` as canonical. But Express does not redirect `fintechpresshub.com` (no-www) requests to www. This creates duplicate content.

**What to build:**
- Add redirect middleware at the top of `artifacts/api-server/src/app.ts`:
  ```ts
  app.use((req, res, next) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host && !host.startsWith('www.') && process.env.NODE_ENV === 'production') {
      return res.redirect(301, `https://www.${host}${req.url}`);
    }
    next();
  });
  ```

**Files:** `artifacts/api-server/src/app.ts`

---

### T2 · HTTP security headers `seo-technical-headers` · 🟡 Medium

**Est: 1h** | Depends on: nothing

Add to Express via a single middleware block. These are minor ranking signals and mandatory for YMYL trust.

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

**Files:** `artifacts/api-server/src/app.ts`

---

### T4 · Immutable cache headers for hashed assets `seo-technical-headers` · 🟡 Medium

**Est: 1h** | Depends on: nothing

Vite content-hashes all JS/CSS filenames. Express should serve them with `Cache-Control: public, max-age=31536000, immutable`. Un-hashed files (HTML, robots.txt, sitemap.xml) should use `no-cache`.

**Files:** `artifacts/api-server/src/app.ts`

---

### T7 · `.env.example` and Hostinger migration checklist `seo-technical-hostinger` · 🟠 Ops

**Est: 1h** | Depends on: nothing

No migration guide exists. A developer setting up Hostinger hPanel with a fresh Node.js app will miss variables.

**What to create:**
- `.env.example` at the project root with every required variable, its purpose, and where to get the value
- `docs/hostinger-deployment.md` covering: hPanel Node.js setup, PostgreSQL provisioning on Hostinger, environment variable entry, build command (`pnpm run build:production`), start command (`node artifacts/api-server/dist/index.mjs`), and port configuration

**Variables to document:**
```
DATABASE_URL        PostgreSQL connection string from Hostinger MySQL/PG panel
SITE_URL            https://www.fintechpresshub.com (no trailing slash)
ADMIN_EMAILS        Comma-separated admin email list
ADMIN_PASSWORD      Initial admin password (bcrypt-hashed on first boot)
INDEXNOW_KEY        8-128 char alphanumeric key from indexnow.org
RESEND_API_KEY      From resend.com dashboard
SESSION_SECRET      Random 64-char string
REPORT_FROM_EMAIL   "FintechPressHub <hello@fintechpresshub.com>"
CONTACT_NOTIFY_TO   Email address for contact form notifications
PITCH_RECIPIENT_EMAIL  Email for guest post pitch notifications
```

**Files:** `.env.example` (create), `docs/hostinger-deployment.md` (create)

---

### O2 · Expand short meta descriptions `seo-onpage-fintech` · 🔴 High

**Est: 1h** | Depends on: nothing

Seven page-level meta descriptions are under 100 characters. The target is 150–160 characters with a keyword and a CTA.

| Page key | Current (chars) | Rewrite target |
|----------|----------------|----------------|
| `home` | 66 | "Scale organic growth with fintech's specialist SEO and content marketing agency — expert writers, tier-1 link placements, and measurable ranking results." |
| `writeForUs` | 42 | "Pitch a guest article to FintechPressHub. We publish expert-level fintech, payments, and lending content for a 50,000+ monthly reader audience." |
| `about` | 64 | "FintechPressHub is a specialist fintech SEO agency built by operators who have worked inside payments, lending, and banking — not generalists learning on your account." |
| `adminServices` | 14 | (add noindex — admin page, doesn't need a real description) |
| `adminBlog` | 19 | (same — noindex) |
| `adminCommissioningTopics` | 43 | (same — noindex) |
| `adminNewsletter` | 77 | (same — noindex) |
| `adminModeration` | 68 | (same — noindex) |

**Files:** `artifacts/fintechpresshub/src/lib/metaData.ts`

---

### O7 · Fix `ORGANIZATION_SCHEMA` missing `@id` `seo-onpage-fintech` · 🟡 Medium

**Est: 0.5h** | Depends on: nothing

`metaData.ts` exports `ORGANIZATION_SCHEMA` without an `@id`. `index.html` also declares an Organization without `@id`. These are two unlinked entity declarations. Merging them into one canonical `@id: "https://www.fintechpresshub.com#organization"` lets Google unify them in its Knowledge Graph.

**Files:** `artifacts/fintechpresshub/src/lib/metaData.ts`, `artifacts/fintechpresshub/index.html`

---

### O3 · Add `og:locale` to `PageMeta.tsx` `seo-onpage-fintech` · 🟡 Medium

**Est: 0.5h** | Depends on: nothing

`index.html` sets `og:locale` as a fallback but Helmet's per-page render overrides the head without re-emitting it. Add `<meta property="og:locale" content="en_US" />` to the `PageMeta` Helmet block.

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`

---

### G1 · Differentiate AI crawlers in robots.txt `seo-geo-fintech` · 🔴 High

**Est: 0.5h** | Depends on: nothing

The current `User-agent: *` blanket allows everything. This needs to be split:

```
# Beneficial AI search agents — cite content in AI answers (allow)
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: YouBot
Allow: /

# AI training scrapers — no citation benefit, consume bandwidth (block)
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

# All standard crawlers
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Disallow: /404
```

**Files:** `artifacts/fintechpresshub/public/robots.txt`

---

### G4 · Complete `sameAs` entity links `seo-geo-fintech` · 🟡 Medium

**Est: 0.5h** | Depends on: nothing

Add Crunchbase, AngelList, and any fintech directory profiles to the `sameAs` array in both `metaData.ts` and `index.html`. AI knowledge graphs cross-reference these to resolve the entity.

**Files:** `artifacts/fintechpresshub/src/lib/metaData.ts`, `artifacts/fintechpresshub/index.html`

---

### W3 · Author `@id` linking in BlogPosting schema `seo-whitehat-fintech` · 🔴 High

**Est: 1h** | Depends on: nothing

The `author` field in `ArticleSchema` emits `name` and `url` but not `"@id"`. Without it Google cannot merge the author entity across posts.

**Change in `PageMeta.tsx`:**
```ts
author: props.article.author
  ? {
      "@type": "Person",
      "@id": `${props.article.authorUrl ?? canonical}#person`,  // ← add this
      name: props.article.author,
      url: props.article.authorUrl,
      jobTitle: props.article.authorJobTitle,
    }
  : undefined,
```

Also ensure `blog-post.tsx` passes `authorUrl` pointing to `/authors/:slug`.

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`, `artifacts/fintechpresshub/src/pages/blog-post.tsx`

---

### W2 · `rel="author"` link tag on blog posts `seo-whitehat-fintech` · 🟡 Medium

**Est: 0.5h** | Depends on: W3

Add to `PageMeta.tsx` when `props.article?.authorUrl` is present:
```tsx
{props.article?.authorUrl ? (
  <link rel="author" href={props.article.authorUrl} />
) : null}
```

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`

---

### T5 · `/status` noindex + `/404` cleanup `seo-technical-prerender` · 🟡 Medium

**Est: 0.5h** | Depends on: nothing

- `/status` page: add `noindex: true` to its `PageMeta` call
- Confirm `robots.txt` `Disallow: /404` applies correctly to the `<Route path="/404">` component

**Files:** `artifacts/fintechpresshub/src/pages/status.tsx`

---

### I5 · Set `lang="en-US"` on `<html>` `seo-international-fintech` · 🟢 Low

**Est: 0.25h** | Depends on: nothing

Change `<html lang="en">` to `<html lang="en-US">` in `index.html`. Assistive technologies and Google both use this for locale disambiguation.

**Files:** `artifacts/fintechpresshub/index.html`

---

### Sprint 1 Agent Skills to create

| Skill file | Covers |
|-----------|--------|
| `/.agents/skills/seo-technical-prerender/SKILL.md` | Prerender pipeline, sitemap image extension, tool page rendering |
| `/.agents/skills/seo-technical-headers/SKILL.md` | Security headers, redirect middleware, cache-control |
| `/.agents/skills/seo-technical-hostinger/SKILL.md` | Hostinger hPanel deployment, env vars, build commands |
| `/.agents/skills/seo-onpage-fintech/SKILL.md` | Meta descriptions, schema fixes, og:locale, HowTo, Service schema |
| `/.agents/skills/seo-geo-fintech/SKILL.md` | robots.txt AI policy, BLUF formatting, speakable schema, entity sameAs |
| `/.agents/skills/seo-whitehat-fintech/SKILL.md` | Author @id linking, rel=author, dateModified, corrections policy |

**Sprint 1 total: ~12.75 hours of engineering**

---

## Sprint 2 — Schema Depth & Discovery (Weeks 3–4)

**Goal:** Add the structured data and content signals that drive featured snippets, AI citations, and rich results. Estimated total: **~30 hours**.

---

### A1 · FAQPage schema on blog posts and service pages `seo-aeo-fintech` · 🔴 High

**Est: 3h** | Depends on: T1 (prerender)

`FAQPage` schema currently only exists on the home page. Blog posts contain natural FAQ sections and service pages contain objection-handling content — both qualify.

**What to build:**
- Add a `faqItems` field to the blog post DB schema (optional `jsonb` array of `{question, answer}`)
- Surface an FAQ editor in the Admin Blog form
- In `blog-post.tsx`, pass `faq={post.faqItems}` to `PageMeta`
- In `service-detail.tsx`, define static FAQ arrays per service and pass to `PageMeta`

**Files:**
```
lib/db/src/schema/blogPosts.ts          ← add faqItems column
artifacts/api-server/src/routes/blog.ts ← expose in response
artifacts/fintechpresshub/src/pages/blog-post.tsx
artifacts/fintechpresshub/src/pages/service-detail.tsx
artifacts/fintechpresshub/src/pages/admin-blog.tsx
```

---

### A5 · `SoftwareApplication` schema on tool pages `seo-aeo-fintech` · 🟡 Medium

**Est: 1h** | Depends on: T1

All 10 free tools at `/tools/*` qualify for rich results if they emit `SoftwareApplication` schema.

```json
{
  "@type": "SoftwareApplication",
  "name": "Fintech Readability Checker",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "url": "https://www.fintechpresshub.com/tools/readability-checker"
}
```

Add a `toolSchema` prop to `PageMeta` and wire it up in each tool page.

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`, each `tools/*.tsx`

---

### A3 · Question-format titles on informational blog posts `seo-aeo-fintech` · 🟡 Medium

**Est: 2h** | Depends on: nothing

Posts targeting informational queries ("how does fintech SEO work") convert better as featured snippets when the H1 and title use question format. This is a content audit, not a code change.

**Deliverable:** A `docs/seo-title-rewrites.md` file listing recommended title rewrites for all 15 seed posts, following the pattern:
- Old: "Topical Authority: The Fintech Marketer's Secret Weapon"
- New: "What Is Topical Authority in Fintech SEO (And How to Build It)?"

This file is a guide for the admin to apply rewrites in the CMS — not automated.

---

### O5 · `HowTo` schema on all tool pages `seo-onpage-fintech` · 🟡 Medium

**Est: 3h** | Depends on: A5

Each tool has 3–5 clear usage steps that map directly to `HowTo` schema. Combine with `SoftwareApplication` schema from A5 — both can coexist.

**Add to `PageMeta.tsx`:**
```ts
export type HowToStep = { name: string; text: string };
export type HowToSchema = { name: string; description: string; steps: HowToStep[]; totalTime?: string };
```

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`, each `tools/*.tsx`

---

### O4 · Tailored schema for each service detail page `seo-onpage-fintech` · 🟡 Medium

**Est: 2h** | Depends on: nothing

`/services/:slug` uses a generic `ServiceSchema`. Each service needs individual `description`, `deliverables`, and `areaServed` values tailored to the service, not a single fallback object.

**What to build:**
- Create a `SERVICE_SCHEMA_MAP` in `service-detail.tsx` keyed by slug
- Each entry has `name`, `description`, `serviceType`, `areaServed`, `deliverables[]`
- Wire into the existing `PageMeta` `service` prop

**Files:** `artifacts/fintechpresshub/src/pages/service-detail.tsx`

---

### G2 · BLUF content formatting guide + admin tooling `seo-geo-fintech` · 🔴 High

**Est: 3h** | Depends on: nothing

AI Overviews (Google's AI answers) and Perplexity preferentially cite pages that answer the query in the first 1–2 sentences. Current blog posts open with scene-setting paragraphs.

**What to build:**
- `docs/seo-bluf-writing-guide.md` — a plain-English guide for authors on BLUF formatting
- In the Admin Blog editor, add a "BLUF summary" text field (1–2 sentences, 40–60 words) that prepends to the stored `content` field as a `<p class="bluf-summary">` element
- Add a visual indicator in the admin editor when the first paragraph exceeds 80 words (flagging non-BLUF posts)

**Files:**
```
lib/db/src/schema/blogPosts.ts            ← add blufSummary text column
artifacts/api-server/src/routes/blog.ts   ← expose in API
artifacts/fintechpresshub/src/pages/admin-blog.tsx
docs/seo-bluf-writing-guide.md            ← create
```

---

### G3 · `speakable` schema on home and blog pages `seo-geo-fintech` · 🟡 Medium

**Est: 2h** | Depends on: T1

`speakable` markup flags specific content sections as suitable for text-to-speech AI (Google Assistant, AI Overviews audio). Add to home, about, and high-traffic blog posts.

**Pattern:**
```json
{
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".bluf-summary", "h1", ".hero-description"]
  }
}
```

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`, `artifacts/fintechpresshub/src/pages/home.tsx`

---

### G5 · Populate `about` and `mentions` entity arrays on blog posts `seo-geo-fintech` · 🟡 Medium

**Est: 2h** | Depends on: nothing

`ArticleSchema` in `PageMeta` supports `about[]` and `mentions[]` but `blog-post.tsx` never passes them. These fields feed AI entity understanding.

**What to build:**
- Add `aboutEntities jsonb` and `mentionEntities jsonb` columns to `blogPostsTable`
- Expose in the admin blog form as comma-separated tag inputs labelled "Topics covered" and "Entities mentioned"
- Wire from `blog-post.tsx` into `PageMeta` `article.about` and `article.mentions`

**Files:**
```
lib/db/src/schema/blogPosts.ts
artifacts/api-server/src/routes/blog.ts
artifacts/fintechpresshub/src/pages/admin-blog.tsx
artifacts/fintechpresshub/src/pages/blog-post.tsx
```

---

### F1 · `HowTo` + `WebPage` schema on `/write-for-us` `seo-offpage-fintech` · 🟡 Medium

**Est: 1h** | Depends on: nothing

The Write For Us page has 3 clear steps (Pitch → Review → Publish). Wrapping these in `HowTo` schema signals to Google this is an active editorial program.

**Files:** `artifacts/fintechpresshub/src/pages/write-for-us.tsx`

---

### F2 · `rel` attribute policy for outbound blog links `seo-offpage-fintech` · 🔴 High

**Est: 2h** | Depends on: nothing

Blog HTML content is stored raw in the DB. Outbound links need consistent `rel` management.

**What to build:**
- A post-processing step in the blog content renderer (`blog-post.tsx`) that:
  - Adds `rel="noopener noreferrer"` to all external links
  - Flags links to domains in a `SPONSORED_DOMAINS` list with `rel="sponsored noopener"`
  - Passes internal links (same domain) through unchanged

**Files:** `artifacts/fintechpresshub/src/pages/blog-post.tsx`

---

### T6 · Add `<image:image>` to blog post sitemap entries `seo-technical-prerender` · 🟡 Medium

**Est: 2h** | Depends on: nothing

Blog posts have cover images (`coverImage` column). Adding image URLs to sitemap entries with the image sitemap extension improves Google Image search visibility.

```xml
<url>
  <loc>https://www.fintechpresshub.com/blog/my-post</loc>
  <image:image>
    <image:loc>https://www.fintechpresshub.com/objects/cover.jpg</image:loc>
    <image:title>Post Title</image:title>
  </image:image>
</url>
```

**Files:** `artifacts/api-server/src/routes/sitemap.ts`

---

### W6 · Meaningful `dateModified` on blog posts `seo-whitehat-fintech` · 🟡 Medium

**Est: 1h** | Depends on: nothing

The DB already has `updatedAt` that auto-bumps on every save. The issue is that minor admin edits (fixing a typo) incorrectly signal a major content update to Google.

**What to build:**
- Add a `lastMaterialUpdateAt` timestamp column to `blogPostsTable`
- Add a "Mark as materially updated today" checkbox in the Admin Blog editor
- Use `lastMaterialUpdateAt ?? publishedAt` for `dateModified` in the schema and the "Last updated" byline

**Files:**
```
lib/db/src/schema/blogPosts.ts
artifacts/api-server/src/routes/blog.ts
artifacts/fintechpresshub/src/pages/admin-blog.tsx
artifacts/fintechpresshub/src/pages/blog-post.tsx
```

---

### W4 · Corrections and updates policy page `seo-whitehat-fintech` · 🟡 Medium

**Est: 1h** | Depends on: nothing

Google's quality rater guidelines explicitly look for corrections policies on YMYL content. Add a short section to `/editorial-guidelines` covering:
- How factual errors are reported
- Correction timeline (48h target)
- How corrections are marked in published articles
- Archival policy for removed content

**Files:** `artifacts/fintechpresshub/src/pages/editorial-guidelines.tsx`

---

### Sprint 2 Agent Skills to create

| Skill file | Covers |
|-----------|--------|
| `/.agents/skills/seo-aeo-fintech/SKILL.md` | FAQPage schema, SoftwareApplication, HowTo, question titles, QAPage |
| `/.agents/skills/seo-offpage-fintech/SKILL.md` | rel attribute policy, write-for-us schema, PR automation, disavow |

**Sprint 2 total: ~25 hours of engineering**

---

## Sprint 3 — Content Architecture (Weeks 5–6)

**Goal:** Build the programmatic content infrastructure that compounds over time — category hubs, glossary, location pages skeleton. Estimated total: **~42 hours**.

---

### P3 · Blog category hub pages `seo-programmatic-fintech` · 🟡 Medium

**Est: 4h** | Depends on: T1

`/blog/category/seo-strategy`, `/blog/category/link-building`, `/blog/category/technical-seo` etc. don't exist. The `blogPostsTable` has a `category` column — hub pages are just filtered list views.

**What to build:**
- New Express route: `GET /api/blog/categories` — returns distinct category slugs + post counts
- New Express route: `GET /api/blog/category/:slug` — returns posts for that category
- New frontend page: `artifacts/fintechpresshub/src/pages/blog-category.tsx`
- Route in `App.tsx`: `/blog/category/:slug`
- Add to sitemap dynamically alongside blog posts
- `ItemList` schema on each category page listing posts
- Add category nav links to the blog listing sidebar

**Files:**
```
artifacts/api-server/src/routes/blog.ts
artifacts/fintechpresshub/src/pages/blog-category.tsx  ← create
artifacts/fintechpresshub/src/App.tsx
artifacts/api-server/src/routes/sitemap.ts
```

---

### P1 + A2 · Fintech SEO Glossary (combined) `seo-programmatic-fintech` + `seo-aeo-fintech` · 🔴 High

**Est: 8h** | Depends on: T1

A `/glossary` index and `/glossary/:term` detail pages are the single highest-leverage programmatic play. Terms like "topical authority SEO", "YMYL content", "E-E-A-T for fintech" have real search volume and near-zero competition at this URL structure.

**What to build:**

*Backend:*
- New DB table: `glossaryTermsTable` — `slug, term, shortDefinition, fullDefinition, relatedTerms[], seeAlso[], category, publishedAt`
- Seed with 30–50 initial fintech SEO terms
- Express routes: `GET /api/glossary`, `GET /api/glossary/:slug`
- Add glossary URLs to sitemap

*Frontend:*
- `/glossary` — hub page with `DefinedTermSet` schema + `ItemList` schema, alphabetical index
- `/glossary/:slug` — term detail page with `DefinedTerm` schema, related terms, internal links to blog posts using that term
- Add "Glossary" to the footer navigation

*Schema:*
```json
{
  "@type": "DefinedTermSet",
  "name": "Fintech SEO Glossary",
  "url": "https://www.fintechpresshub.com/glossary"
}
```

**Files:**
```
lib/db/src/schema/glossaryTerms.ts        ← create
lib/db/src/schema/index.ts                ← add export
lib/db/src/seed-data/glossaryTerms.ts     ← create
lib/db/src/seed.ts                        ← add seeder
artifacts/api-server/src/routes/glossary.ts ← create
artifacts/api-server/src/routes/index.ts  ← register
artifacts/api-server/src/routes/sitemap.ts
artifacts/fintechpresshub/src/pages/glossary.tsx         ← create
artifacts/fintechpresshub/src/pages/glossary-term.tsx    ← create
artifacts/fintechpresshub/src/App.tsx
artifacts/fintechpresshub/src/components/Footer.tsx
```

---

### P4 · Confirm tool pages included in prerender `seo-programmatic-fintech` · 🔴 High

**Est: 1h** | Depends on: T1

The 10 tool pages at `/tools/*` must be in the prerender route list. The tool pages are entirely client-side (no API calls on mount) so prerendering them is straightforward — they just need to be included in the crawl list.

**Files:** `artifacts/fintechpresshub/scripts/prerender.mjs`

---

### I1 · `hreflang` baseline tags `seo-international-fintech` · 🟡 Medium

**Est: 1h** | Depends on: nothing

Even with a single English version, `hreflang="en"` with `x-default` tells Google which language version to serve. Without it, Google may incorrectly infer the target locale.

**Add to `PageMeta.tsx`:**
```tsx
<link rel="alternate" hrefLang="en" href={canonical} />
<link rel="alternate" hrefLang="x-default" href={canonical} />
```

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`

---

### I3 · Location landing page infrastructure `seo-international-fintech` · 🔴 High

**Est: 8h** | Depends on: T1, P3

"fintech SEO agency London", "fintech SEO agency New York", "fintech content marketing Singapore" are high-intent queries with low competition.

**What to build:**

*Backend:*
- New DB table: `locationPagesTable` — `slug, city, country, countryCode, headline, description, localTrustSignals[], testimonialId`
- Express route: `GET /api/locations/:slug`
- Add to sitemap

*Frontend:*
- `/locations/:slug` — location landing page template with:
  - Localised headline ("Fintech SEO Agency in London")
  - City-specific trust signals and case study references
  - Same services/pricing CTA as main site
  - `LocalBusiness` schema with `addressLocality`

*Seed locations:* London, New York, Singapore, Sydney, Dubai, Toronto

**Files:**
```
lib/db/src/schema/locationPages.ts       ← create
artifacts/api-server/src/routes/locations.ts ← create
artifacts/fintechpresshub/src/pages/location.tsx ← create
artifacts/fintechpresshub/src/App.tsx
artifacts/api-server/src/routes/sitemap.ts
```

---

### W1 · Guest post editorial workflow in admin `seo-whitehat-fintech` · 🟡 Medium

**Est: 4h** | Depends on: nothing

The moderation inbox receives pitches but has no structured pipeline. Add status tracking.

**What to build:**
- Add `status` column to `guestPostSubmissionsTable`: `received | reviewing | accepted | rejected | published`
- Add `adminNotes text` column for internal feedback
- Update `admin-moderation.tsx` to show status badges, a status-change dropdown, and a notes field
- Update `/write-for-us` page to show a "What happens next" timeline: "We review within 5 business days → Editor responds with feedback → Accepted posts go live within 3 weeks"

**Files:**
```
lib/db/src/schema/guestPostSubmissions.ts
artifacts/api-server/src/routes/adminModeration.ts
artifacts/fintechpresshub/src/pages/admin-moderation.tsx
artifacts/fintechpresshub/src/pages/write-for-us.tsx
```

---

### P5 · "Top Fintech Publications" resource page `seo-programmatic-fintech` · 🟡 Medium

**Est: 4h** | Depends on: T1

A `/resources/fintech-publications` page listing 40–50 tier-1 fintech publications (with DA, traffic tier, topic focus, and pitch guidelines) is the type of data-driven linkable asset that earns natural backlinks from fintech marketing blogs.

**What to build:**
- Static data file: `artifacts/fintechpresshub/src/data/fintechPublications.ts`
- Frontend page: `/resources/fintech-publications`
- `ItemList` schema listing each publication as a `ListItem`
- Link from the Write For Us page and Footer

**Files:**
```
artifacts/fintechpresshub/src/data/fintechPublications.ts ← create
artifacts/fintechpresshub/src/pages/resources/fintech-publications.tsx ← create
artifacts/fintechpresshub/src/App.tsx
artifacts/fintechpresshub/src/pages/write-for-us.tsx
```

---

### Sprint 3 Agent Skills to create

| Skill file | Covers |
|-----------|--------|
| `/.agents/skills/seo-programmatic-fintech/SKILL.md` | Category hubs, glossary, location pages, resource pages, comparison pages |
| `/.agents/skills/seo-international-fintech/SKILL.md` | hreflang, og:locale alternates, location pages, locale formatting |

**Sprint 3 total: ~30 hours of engineering**

---

## Sprint 4 — Scale & Authority (Weeks 7–8)

**Goal:** The harder, higher-effort items that compound the earlier wins. Estimated total: **~35 hours**.

---

### P2 · Service comparison landing pages `seo-programmatic-fintech` · 🔴 High

**Est: 6h** | Depends on: T1, P3

"FintechPressHub vs [competitor]" and "fintech content agency vs generalist agency" pages are high-converting, long-tail queries.

**What to build:**
- Static data file with 5–8 comparisons
- Template page `/compare/:slug` with a comparison table, pros/cons, and a CTA
- `Product` schema with `CompetitiveAdvantage` notes
- Add to sitemap and footer

**Files:**
```
artifacts/fintechpresshub/src/data/comparisons.ts  ← create
artifacts/fintechpresshub/src/pages/compare.tsx    ← create
artifacts/fintechpresshub/src/App.tsx
```

---

### A2 (part 2) · Glossary admin CMS `seo-aeo-fintech` · 🟡 Medium

**Est: 4h** | Depends on: Sprint 3 P1+A2

Add a full CRUD admin panel for the glossary (list, create, edit, delete terms) so new terms can be added without code changes.

**Files:**
```
artifacts/fintechpresshub/src/pages/admin-glossary.tsx  ← create
artifacts/api-server/src/routes/glossary.ts             ← extend with POST/PUT/DELETE
artifacts/fintechpresshub/src/App.tsx
```

---

### F3 · PR amplification webhook `seo-offpage-fintech` · 🟡 Medium

**Est: 3h** | Depends on: nothing

After a post is published, a structured notification should be sent to a configurable webhook URL (Slack, Make, Zapier) with the post title, URL, author, and category — so the team can immediately amplify via social and PR channels.

**What to build:**
- Add `PR_WEBHOOK_URL` env variable (optional)
- After a successful publish in `blog.ts`, POST to the webhook URL with post metadata
- Log webhook result without blocking the publish response

**Files:** `artifacts/api-server/src/routes/blog.ts`, `.env.example`

---

### F4 · Surface per-author RSS in author profile head `seo-offpage-fintech` · 🟢 Low

**Est: 0.5h** | Depends on: nothing

Per-author RSS feeds (`/authors/:slug/rss.xml`) exist and are in the sitemap, but they should also appear as `<link rel="alternate" type="application/rss+xml">` autodiscovery tags on every blog post **by that author** — not just on the author profile page.

**Files:** `artifacts/fintechpresshub/src/pages/blog-post.tsx`

---

### A4 · `QAPage` schema on Contact page `seo-aeo-fintech` · 🟢 Low

**Est: 0.5h** | Depends on: nothing

The contact page likely attracts queries like "how do I hire a fintech SEO agency". A small FAQ block + `QAPage` schema on the contact page targets these queries.

**Files:** `artifacts/fintechpresshub/src/pages/contact.tsx`

---

### I2 · `og:locale:alternate` for UK/APAC markets `seo-international-fintech` · 🟢 Low

**Est: 0.5h** | Depends on: I1

Add `og:locale:alternate` for `en_GB` and `en_SG` to improve LinkedIn/Facebook click-through from UK and Singapore audiences.

**Files:** `artifacts/fintechpresshub/src/components/PageMeta.tsx`

---

### I4 · Locale-aware date formatting `seo-international-fintech` · 🟢 Low

**Est: 1h** | Depends on: nothing

Replace all hardcoded date renders in the frontend with `Intl.DateTimeFormat` using the user's browser locale, defaulting to `en-GB` (day-first) as it's more internationally neutral than `en-US`.

**Files:** `artifacts/fintechpresshub/src/pages/blog-post.tsx`, `artifacts/fintechpresshub/src/pages/blog.tsx`

---

### F5 · Disavow file admin infrastructure `seo-offpage-fintech` · 🟠 Risk

**Est: 3h** | Depends on: nothing

For a YMYL fintech site, the ability to generate and manage a disavow file is important for link health.

**What to build:**
- New DB table: `disavowDomainsTable` — `domain, reason, addedAt, addedBy`
- Admin route: `/admin/disavow` — list domains, add/remove
- API endpoint: `GET /api/admin/disavow/export` — returns a Google Disavow Tool-compatible plain text file
- Download button in the admin UI

**Files:**
```
lib/db/src/schema/disavowDomains.ts             ← create
artifacts/api-server/src/routes/disavow.ts      ← create
artifacts/fintechpresshub/src/pages/admin-disavow.tsx ← create
```

---

### W5 · Author RSS autodiscovery on per-post pages `seo-whitehat-fintech` · 🟢 Low

**Est: 1h** | Depends on: F4

Blog posts by a specific author should emit that author's RSS feed in the `<head>` autodiscovery link, in addition to the site-wide feed. Already handled on author profile pages — needs extending to individual posts.

**Files:** `artifacts/fintechpresshub/src/pages/blog-post.tsx`

---

### O6 · Pass DB tags to `PageMeta` on all blog posts `seo-onpage-fintech` · 🟢 Low

**Est: 0.5h** | Depends on: nothing

`blog-post.tsx` has access to the post's `tags` array from the API but `PageMeta` `article.tags` is not being populated. This causes `article:tag` OG meta tags to be missing from all posts.

**Files:** `artifacts/fintechpresshub/src/pages/blog-post.tsx`

---

### Sprint 4 Agent Skills — no new ones needed

All 8 skills are created by end of Sprint 3. Sprint 4 work falls within existing skills.

**Sprint 4 total: ~20 hours of engineering**

---

## Full Effort Summary

| Sprint | Focus | Hours | Weeks |
|--------|-------|-------|-------|
| Sprint 1 | Foundation, headers, quick wins | ~13h | 1–2 |
| Sprint 2 | Schema depth, BLUF, discovery | ~25h | 3–4 |
| Sprint 3 | Content architecture, glossary, locations | ~30h | 5–6 |
| Sprint 4 | Scale, authority, comparison pages | ~20h | 7–8 |
| **Total** | | **~88h** | **8 weeks** |

---

## Agent Skills Created (all 8 categories)

| Skill | Category | Location |
|-------|----------|----------|
| `seo-technical-prerender` | Technical | `/.agents/skills/seo-technical-prerender/SKILL.md` |
| `seo-technical-headers` | Technical | `/.agents/skills/seo-technical-headers/SKILL.md` |
| `seo-technical-hostinger` | Technical | `/.agents/skills/seo-technical-hostinger/SKILL.md` |
| `seo-onpage-fintech` | On-Page | `/.agents/skills/seo-onpage-fintech/SKILL.md` |
| `seo-offpage-fintech` | Off-Page | `/.agents/skills/seo-offpage-fintech/SKILL.md` |
| `seo-geo-fintech` | GEO | `/.agents/skills/seo-geo-fintech/SKILL.md` |
| `seo-aeo-fintech` | AEO | `/.agents/skills/seo-aeo-fintech/SKILL.md` |
| `seo-international-fintech` | International | `/.agents/skills/seo-international-fintech/SKILL.md` |
| `seo-programmatic-fintech` | Programmatic | `/.agents/skills/seo-programmatic-fintech/SKILL.md` |
| `seo-whitehat-fintech` | White Hat | `/.agents/skills/seo-whitehat-fintech/SKILL.md` |

---

## Quick-Start: Highest ROI Items to Implement First

If you want to pick just the items that unlock the most value fastest:

1. **T1** — Prerender pipeline (unlocks all on-page improvements)
2. **T3** — www redirect (eliminates duplicate content today)
3. **G1** — robots.txt AI crawler policy (allows AI citation traffic)
4. **W3** — Author `@id` in BlogPosting (E-E-A-T entity linking)
5. **O2** — Expand meta descriptions (immediate SERP click-through improvement)
6. **A1** — FAQPage on blog posts (featured snippet + AI Overview eligibility)
7. **P1+A2** — Glossary pages (compounding programmatic SEO asset)

These 7 items total approximately **~25 hours** and address every category.
