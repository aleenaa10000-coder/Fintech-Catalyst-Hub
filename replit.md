# FintechPressHub

## Overview

Professional fintech digital marketing & content agency website. React + Vite + Tailwind frontend, Express API backend, PostgreSQL database via Drizzle ORM.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node 24
- **Frontend**: React + Vite + Tailwind + shadcn/ui + framer-motion + wouter (in `artifacts/fintechpresshub`)
- **Backend**: Express 5 (in `artifacts/api-server`) — routes for blog, services, pricing, testimonials, trust stats, contact form, guest post submissions
- **Database**: PostgreSQL + Drizzle ORM (schemas in `lib/db/src/schema`)
- **API contract**: OpenAPI in `lib/api-spec/openapi.yaml` — codegen produces React Query hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`)
- **Seed**: auto-runs on API server startup via `runSeed(db)` from `@workspace/db` — idempotent, only inserts when tables are empty (pricing_plans, services, testimonials, site_stats, blog_posts). Source data lives in `lib/db/src/seed-data/*.json`. The CLI alternative `pnpm --filter @workspace/scripts run seed` is destructive (clears + re-inserts) and meant for manual resets.

## Pages

Home, About, Services (+ per-service detail at `/services/:slug` for the 5 seeded services — fintech-content-writing, off-page-seo, guest-posting, topical-authority, fintech-seo-audit), Pricing, Blog (+ post detail), Authors index (`/authors`) + author profile (`/authors/:slug`), Write For Us, Contact, Privacy Policy, Refund Policy, Terms, Editorial Guidelines, 404.

The service detail page (`artifacts/fintechpresshub/src/pages/service-detail.tsx`) reuses the cached `useListServices` query and finds the service by slug client-side — no extra API roundtrip. Icons + short labels are shared via `src/lib/serviceIcons.ts`, and per-service FAQs (rendered as a shadcn Accordion section + emitted as FAQPage JSON-LD via `<PageMeta faq={...} />`) live in `src/lib/serviceFaqs.ts`. Each detail page also emits `Service` JSON-LD (provider Organization, areaServed Worldwide, deliverables → OfferCatalog) and an explicit canonical. The sitemap is now served live by the API (`artifacts/api-server/src/routes/sitemap.ts` → `/sitemap.xml`) — it reads static routes + author slugs from a small in-file list and dynamic blog post URLs from Postgres, so new posts appear in the sitemap immediately. The static `scripts/generate-sitemap.mjs` was removed.

FAQ sections + FAQPage JSON-LD are also rendered on `/` (5 top-of-funnel FAQs inlined in `home.tsx`), `/pricing` (6 FAQs inlined in `pricing.tsx`), and `/contact` (6 sales-discovery FAQs inlined in `contact.tsx`), all via the same `<PageMeta faq={...} />` path.

The `/about` page renders a "The team behind the work" section that maps over the 4 authors from `data/authors.ts` (each card links to `/authors/:slug`) and emits `AboutPage` JSON-LD via `<PageMeta aboutPage={...} />`. The schema's `mainEntity` is an enriched `Organization` with `slogan`, `knowsAbout` (fintech sub-verticals + capabilities), `numberOfEmployees`, and an `employee` array of `Person` nodes — visible team + matching schema is the E-E-A-T pattern Google rewards in YMYL verticals.

The `/write-for-us` page (`src/pages/write-for-us.tsx`) is laid out as: PageHero → **Benefits** (4 icon items + image with floating "Submit Your Guest Post" anchor that smooth-scrolls to the form) → **Topics grid** (16 fintech category cards in a 4-col grid, each with 3 bullet sub-topics) → **Guidelines grid** (12 mini icon cards + a "what we do NOT accept" callout) → **Pitch form** (centred, `max-w-3xl`, with the existing Zod-validated submission flow + success animation untouched) → **FAQ accordion**. Color palette stays on the FintechPressHub primary blue (`hsl(var(--primary))` = `#0052FF`); the topic data array and guideline data array live at the top of the file and drive both sections via `.map()`.

## Author profiles

- Static dataset at `artifacts/fintechpresshub/src/data/authors.ts` for the 4 writers (Marcus Webb, Priya Nair, James Okafor, Sarah Chen): name, slug, role, photo path, short + full bio, expertise tags, credentials, location, years of experience, and social links.
- AI-generated portrait headshots live in `artifacts/fintechpresshub/public/author-photos/<slug>.png` and are referenced via `/author-photos/<slug>.png` (Vite serves the public folder at the site root). Each `Author` has a required `photo` field; the avatar components fall back to initials if the photo is missing.
- Pages:
  - `/authors` (`artifacts/fintechpresshub/src/pages/authors.tsx`) — "Meet the Team" index that lists all writers in a 2-column grid with photo, role, short bio, location, years of experience, live article count, and social links.
  - `/authors/:slug` (`artifacts/fintechpresshub/src/pages/author.tsx`) — full profile with hero, multi-paragraph bio, expertise tags, credentials sidebar, full article list, and "other writers" cross-links.
- Entry points: blog post hero + bottom bio card link to `/authors/:slug` (helper `authorSlugFromName` keeps slug derivation consistent); blog index has a "Meet the team" strip with stacked avatars; footer Company column has a "Meet the Team" link.

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regen client + zod from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema (dev)
- `pnpm --filter @workspace/scripts run seed` — seed demo content

## Per-author RSS feeds

Each contributor on `/authors/<slug>` has their own dynamic RSS 2.0 feed at `/authors/<slug>/rss.xml`, served by the API server (`artifacts/api-server/src/routes/authorRss.ts`). The route imports the canonical authors list and static seed posts directly from the frontend (`artifacts/fintechpresshub/src/data/{authors.ts,posts.js}`) and merges them with API-published `blog_posts` rows using the same overlay rule as `usePublicPosts` (API row wins on slug collision). Format mirrors the sitewide `scripts/generate-rss.mjs` output, including `dc:creator`, `category`, `description`, and `content:encoded`. Unknown slugs → 404.

- Mounted at root in `artifacts/api-server/src/app.ts` so the feed URL mirrors the public profile URL.
- Vite dev proxy: `^/authors/[^/]+/rss\.xml$` in `artifacts/fintechpresshub/vite.config.ts` (regex limits proxy to `.xml` only — SPA still owns `/authors/<slug>`).
- Sitemap (`artifacts/api-server/src/routes/sitemap.ts`) consumes `KNOWN_AUTHOR_SLUGS` exported from `authorRss.ts` so adding a new author in `authors.ts` automatically extends both the sitemap (profile + RSS entries) and the feed registry — no second list to maintain.
- Autodiscovery: `PageMeta` accepts an optional `rssFeeds: { href, title }[]` prop and emits one extra `<link rel="alternate" type="application/rss+xml">` per entry. Author profile page passes its per-author feed so feed readers detect it on visit.
- Visible affordance: a Subscribe-via-RSS icon button sits in the author-profile social row (`artifacts/fintechpresshub/src/pages/author.tsx`).
- Cache: `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`.
- Cross-package import note: api-server `tsconfig.json` drops `rootDir` and includes `../fintechpresshub/src/data/{authors.ts,posts.d.ts}` so `tsc --noEmit` resolves the imports; esbuild bundles the actual JS at build time.

## SEO automation (IndexNow on publish + daily)

When an admin publishes or updates a post via `POST /api/blog/posts` or `PATCH /api/blog/posts/:slug`, the server now **awaits** the IndexNow ping (with a 4s timeout) and returns the result inline as `seoNotification` on the response (`PublishedBlogPost = BlogPost & { seoNotification: SeoNotification }`). The admin UI (`artifacts/fintechpresshub/src/pages/admin-blog.tsx`) reads this and shows a real status toast — `"IndexNow accepted N URLs for Bing, Yandex, Seznam & Naver"` on success, or a warning toast surfacing the actual failure mode (`skipped_no_key`, `skipped_malformed_key`, `rejected`, `error`) instead of the previous fire-and-forget "Search engines have been notified" lie.

The `keyLocation` URL in `artifacts/api-server/src/lib/seo.ts` was also fixed — it previously sent `${SITE_URL}/${INDEXNOW_KEY}.txt` (the legacy convention) but the API only serves the verification key at the fixed path `/indexnow-key.txt`, which would have caused IndexNow to reject the ping with a verification failure. The daily job already used the correct path; both code paths now agree.

In addition, the API server schedules a daily IndexNow submission (`artifacts/api-server/src/jobs/indexNowDaily.ts`) that pings Bing, Yandex, Seznam, and Naver about blog posts published since the last successful run. State (`indexnow:lastRunAt`) is persisted in the `kv_store` Postgres table so restarts don't cause re-submissions. A 1h overlap window prevents missed posts at the boundary, capped at 36h on first run / after long downtime.

- Required secret: `INDEXNOW_KEY` (8–128 chars, `[a-zA-Z0-9-]`). Generate one at https://www.bing.com/indexnow. Without it, the scheduler logs once and stays disabled.
- Verification key file is served dynamically at the fixed path `/indexnow-key.txt` (see `artifacts/api-server/src/routes/indexNowKey.ts`). The IndexNow API call passes this URL as `keyLocation` so search engines look there instead of `/<key>.txt`. The path is exposed in `artifacts/api-server/.replit-artifact/artifact.toml` and proxied in `artifacts/fintechpresshub/vite.config.ts`. No file needs to be committed.
- Initial run fires 30 s after boot; subsequent runs every 24 h.
- Manual one-off submission of all sitemap URLs is still available via `pnpm --filter @workspace/fintechpresshub run ping-search-engines` (now fetches the live sitemap instead of a static file).
- Google does not participate in IndexNow — submit the sitemap once in Search Console; Google then re-crawls it on its own schedule.

## Hosting

User intends to host the final site on Hostinger Business plan. Frontend builds to a static bundle (`pnpm --filter @workspace/fintechpresshub run build` → `dist/public`) suitable for Hostinger's static hosting; the Node Express API can be hosted via Hostinger's Node.js app feature or any Node host pointed to from the same domain.

## Email (contact form)

- `artifacts/api-server/src/lib/mailer.ts` — nodemailer transporter (cached, secure mode auto-picked for port 465; no-ops with warning if SMTP creds missing).
- `POST /api/contact` sends two emails async (non-blocking on the response):
  1. Notification to `CONTACT_NOTIFY_TO` with `replyTo` set to the submitter.
  2. Branded auto-reply confirmation to the submitter.
- Secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_NOTIFY_TO`.

## Email reports (Resend)

- `POST /api/tools/financial-health-score/email-report` — accepts the Financial Health Score result + visitor email, subscribes them to the newsletter (source `financial-health-tool`), and sends an HTML report via Resend's HTTP API.
- Backend: `artifacts/api-server/src/routes/tools.ts` — uses generated `EmailFinancialHealthScoreReportBody` Zod schema; gracefully degrades when `RESEND_API_KEY` is missing (still subscribes; returns `deliveryStatus: "skipped_no_provider"`).
- Frontend: `EmailReportCard` inside `artifacts/fintechpresshub/src/pages/tools/financial-health-score-calculator.tsx` — uses generated `useEmailFinancialHealthScoreReport` mutation hook; renders different UI for `sent` / `skipped_no_provider` / `failed`.
- Secrets: `RESEND_API_KEY` (required for delivery), `REPORT_FROM_EMAIL` (defaults to `FintechPressHub <reports@fintechpresshub.com>`; currently set to `FintechPressHub <onboarding@resend.dev>` so emails work before the fintechpresshub.com sending domain is verified in Resend → swap once DNS is configured at Resend → Settings → Domains).

## Daily digest

- `GET /api/contact/digest?hours=24&dryRun=0` — emails a summary of contact submissions in the last N hours (default 24, max 720) to `CONTACT_NOTIFY_TO`.
- Auth: `Authorization: Bearer <DIGEST_TOKEN>` header (or `?token=` query). Returns 401 on mismatch, 503 if `DIGEST_TOKEN` / SMTP recipient unset.
- `?dryRun=1` returns the JSON payload (count, since, subject, text preview) without sending — useful for cron testing.
- Designed to be triggered by a Replit Scheduled Deployment or external cron once per day.

## Object Storage (cover image uploads)

- Bucket integrated via `@google-cloud/storage` + Replit sidecar credentials (env: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`).
- Server: `artifacts/api-server/src/lib/object-storage/*` and `artifacts/api-server/src/routes/uploads.ts` expose:
  - `POST /api/uploads/request-url` (auth) — returns presigned PUT URL + `objectPath`
  - `POST /api/uploads/finalize` (auth) — sets public ACL, returns canonical `/objects/<id>` path
  - `GET /objects/*objectPath` (public) — streams the file
- Routes mounted at root in `app.ts`; `artifact.toml` exposes `/objects` (and `/sitemap.xml`) on the API service.
- Client uses Uppy v5 `DashboardModal` via `artifacts/fintechpresshub/src/components/ObjectUploader.tsx`. `/admin/blog` shows an upload button next to the cover image URL field in both the create form and the inline `PostEditor`; on success the field is auto-filled with `/objects/<id>`. Vite dev proxy forwards `/objects` to the API server.

## Blog post page: SEO + UX upgrades

`src/pages/blog-post.tsx` and `src/components/PageMeta.tsx` were upgraded for richer search/social signals and better skim-readability:

- **JSON-LD changed from `Article` to `BlogPosting`** with `@id`, `mainEntityOfPage`, `isPartOf` (the Blog), `inLanguage: "en"`, `wordCount`, `timeRequired` (ISO 8601 e.g. `PT8M`), and an enriched `author` block carrying `url` (link to the author's profile page) and `jobTitle`. `image` is emitted as an array so Google can pick the best aspect ratio.
- **Article-flavoured Open Graph tags** are now rendered on post pages: `article:published_time`, `article:modified_time`, `article:author`, `article:section`, and one `article:tag` per tag. These are what LinkedIn / Facebook use to show the author byline + topic chips in the link preview.
- **Cover image is LCP-optimized**: explicit `width={1200} height={600}`, `loading="eager"`, `fetchPriority="high"`, `decoding="async"`, and a richer descriptive `alt` (`${title} — ${category} guide cover image`). Wrapped in a `<figure>` so it's semantically correct.
- **"Key takeaways" panel** sits between the cover and the article body. It's auto-built from the first 3–5 `<h2>` headings of the post (no extra data needed) and renders a numbered, anchor-linked list. This gives readers a BLUF (Bottom Line Up Front) summary, and helps featured snippets / AI Overviews cite the post.
- **Hero stats row** now shows date · `${minutes} min read` · `${words.toLocaleString()} words` (the word-count chip is hidden below `sm` to save horizontal space). Word count and reading time are computed once with `useMemo` from the post body and reused for the JSON-LD.
- **"Last updated" indicator**: `blog_posts.updated_at` is a `timestamp` column auto-bumped on every row UPDATE via Drizzle's `$onUpdate(() => new Date())` hook (see `lib/db/src/schema/blogPosts.ts`). New rows default to the same instant as `published_at`, so the public blog can detect "never edited" by comparing the two values. The API exposes it as `BlogPost.updatedAt` (added to `lib/api-spec/openapi.yaml` and surfaced through `serialize()` in `artifacts/api-server/src/routes/blog.ts`); `usePublicPosts.fromApi()` maps it to the optional `PublicPost.dateModified`. The blog post hero shows an "Updated <date>" line (with a green pencil icon) under the publish date *only* when `dateModified` is at least one full day after `date` — controlled by the `isMeaningfullyUpdated()` helper in `blog-post.tsx`. The same gate decides whether `article.dateModified` is passed to `<PageMeta>` (which drives the BlogPosting JSON-LD `dateModified` and the `article:modified_time` OG tag), so visible UI and crawler signals stay in sync. Static seed posts in `posts.js` have no `dateModified` and never show the indicator. After deploying schema changes, run `pnpm --filter @workspace/db run push` against the prod DB to add the column (existing rows default to NOW() on add — re-publish through `/admin/blog` to set a meaningful value).
- **Build-time prerender for crawlers**: `scripts/prerender.mjs` runs as part of `pnpm --filter @workspace/fintechpresshub run build` (chained after `vite build`). It reuses `buildMeta` + `shellInject` exported from `scripts/bot-og-plugin.mjs` to write one fully-rendered `dist/public/<route>/index.html` per known route — every static page in `PAGE_META`, every author in `AUTHORS`, every service slug from `loadServices()`, and every blog post slug from `getAllPosts(API_BASE)`. The static deploy (`serve = "static"` in `artifact.toml`) serves these files directly when they exist, falling through to `/index.html` (the SPA shell) for unknown routes via the `/*  →  /index.html` rewrite. Each emitted file contains the per-page `<title>`, canonical, full Article-flavoured OG block (with `og:image:width/height/alt`), `article:*` meta, 4–7 JSON-LD schemas, and a visible `<h1>` + intro inside `<div data-bot-og="body">…</div>` — which React's `createRoot().render()` cleanly replaces on hydration with no mismatch warnings. `loadPosts()` in `bot-og-plugin.mjs` falls back to dynamically importing `src/data/posts.js` when the API isn't reachable at build time, so static seed posts always prerender even without an API server in CI; API posts overlay seed posts on slug collision (mirroring `usePublicPosts`). The same plugin still runs in `vite dev` and `vite preview` via `configureServer`/`configurePreviewServer`, so dev and prod produce identical crawler output. New posts published via `/admin/blog` *after* a deploy fall through to the SPA shell until the next rebuild — Googlebot still sees them via runtime JS execution; social crawlers see the generic shell until rebuild.

## Public blog: merged feed (static seed + API posts)

The public-facing blog (`/blog`, `/blog/:slug`, `/authors`, `/authors/:slug`, `/404`) reads through `src/data/usePublicPosts.ts` instead of importing the static `src/data/posts.js` array directly. The hook calls `useListBlogPosts()` for API posts, maps the API `BlogPost` shape (`coverImage` → `image`, `publishedAt` → `date`, `readingMinutes` → `readTime`, id namespaced as `api-<n>`) into the unified `PublicPost` shape used by the UI, then merges with the static seed array — **API posts overlay seed posts on slug collision**, so re-publishing a seed post through `/admin/blog` is the documented way to "edit" it. Sort order is newest-first by `date`. Static posts render instantly so the page never blocks on the API; API posts fold in on resolve. `usePublicPostBySlug(slug)` is a convenience wrapper used by `blog-post.tsx` (which now also gates the 404 redirect on `!isLoading` so direct hits to API-only posts don't briefly 404 before the data lands).

## Admin auth & gate

The `/admin/blog` route is protected via Replit OIDC (`@workspace/replit-auth-web` → `useAuth()`). Sign-in flow: `/api/login` → Replit OIDC → `/api/callback` → cookie-backed session row in `sessions` table; `/api/logout` clears it. The admin page renders three states: loading, "Admin sign in required" (signed out), and "Not authorized" (signed in but not on the allowlist), before rendering the publish/edit/delete UI.

The allowlist is the comma-separated env var `ADMIN_EMAILS` (case-insensitive). `isAdminEmail(email)` lives in `artifacts/api-server/src/lib/auth.ts` and is computed at read-time, so updating `ADMIN_EMAILS` takes effect on the next `/api/auth/user` call without forcing users to log out. The current user's `isAdmin` flag is part of the `AuthUser` schema (`lib/api-spec/openapi.yaml`) and is regenerated through `pnpm --filter @workspace/api-spec run codegen`.

Server-side, `requireAdmin` middleware (in `artifacts/api-server/src/routes/blog.ts`) gates `POST/PATCH/DELETE /api/blog/posts*`: returns 401 when no session, 403 when the session's email isn't on the allowlist. Without `ADMIN_EMAILS` set, no user is admin — the page is effectively locked.

## Admin author selector

- `/admin/blog` exposes a "Team member" shadcn `<Select>` above the Author / Author role inputs in both the new-post form and the inline `PostEditor`. Options are sourced from `src/data/authors.ts` (Marcus, Priya, James, Sarah) and a "Guest author" sentinel.
- Each option is a rich row built with `@radix-ui/react-select` primitives directly (the shadcn `SelectItem` wrapper would mirror children into the trigger): a 36px shadcn `Avatar` (photo + initials fallback) on the left, name in `SelectPrimitive.ItemText`, and the role as a muted subtitle. The guest option uses a `UserPlus` glyph in place of the avatar.
- Selecting a team member auto-fills both the `author` and `authorRole` text fields (still editable). Selecting "Guest author" clears them so they can be typed freehand. The current selection is derived from the form state so editing a post with a known team member auto-selects them in the dropdown.

## Commissioning topics (admin-curated pitch list)

- Drizzle table `commissioning_topics` (`lib/db/src/schema/commissioningTopics.ts`): `id`, `title`, `angle` (long brief), `category`, `priority` (lower = higher), `isActive`, `createdAt`, `updatedAt`. Push with `pnpm --filter @workspace/db run push`.
- API in `artifacts/api-server/src/routes/commissioningTopics.ts`. Public `GET /api/commissioning-topics` returns active rows sorted by priority asc then `createdAt` desc. Admin `GET/POST /api/admin/commissioning-topics` and `PATCH/DELETE /api/admin/commissioning-topics/:id` are gated by the same `requireAdmin` (session + `isAdminEmail`) used by the blog admin. Mounted in `routes/index.ts`.
- OpenAPI: tag `commissioningTopics`, schemas `CommissioningTopic` + `CommissioningTopicInput` (title required, 3–160 chars; angle ≤600; category ≤80; priority 0–9999). Re-run `pnpm --filter @workspace/api-spec run codegen` after any spec change to refresh React Query hooks (`useListCommissioningTopics`, `useListAdminCommissioningTopics`, `useCreateCommissioningTopic`, `useUpdateCommissioningTopic`, `useDeleteCommissioningTopic`) and the body Zod (`CreateCommissioningTopicBody`).
- Admin UI at `/admin/commissioning-topics` (`artifacts/fintechpresshub/src/pages/admin-commissioning-topics.tsx`, route in `App.tsx`, meta key `adminCommissioningTopics`). Login gate via `useAuth` mirroring `admin-services`. Inline edit, eye-toggle to hide/show without delete, priority field, category field. After every mutation invalidates both the admin and the public query keys so the Write For Us page updates instantly.
- Public surface on `/write-for-us` inside the `#topics` section: `<CommissioningTopicsBoard>` (defined in `write-for-us.tsx`) fetches via `useListCommissioningTopics`, auto-rotates the featured topic every 6 s, has prev/next chevrons, and lists every active topic as a clickable chip. Clicking a topic calls `handleTopicCardClick(title)` — same handler as the static topic-category cards — which pre-fills the pitch form's `topic` field and scrolls to the form. Returns `null` when the list is empty so the page stays clean before the editor adds anything.
