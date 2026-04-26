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

## SEO automation (IndexNow daily)

The API server schedules a daily IndexNow submission (`artifacts/api-server/src/jobs/indexNowDaily.ts`) that pings Bing, Yandex, Seznam, and Naver about blog posts published since the last successful run. State (`indexnow:lastRunAt`) is persisted in the new `kv_store` Postgres table so restarts don't cause re-submissions. A 1h overlap window prevents missed posts at the boundary, capped at 36h on first run / after long downtime.

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

## Admin author selector

- `/admin/blog` exposes a "Team member" shadcn `<Select>` above the Author / Author role inputs in both the new-post form and the inline `PostEditor`. Options are sourced from `src/data/authors.ts` (Marcus, Priya, James, Sarah) and a "Guest author" sentinel.
- Each option is a rich row built with `@radix-ui/react-select` primitives directly (the shadcn `SelectItem` wrapper would mirror children into the trigger): a 36px shadcn `Avatar` (photo + initials fallback) on the left, name in `SelectPrimitive.ItemText`, and the role as a muted subtitle. The guest option uses a `UserPlus` glyph in place of the avatar.
- Selecting a team member auto-fills both the `author` and `authorRole` text fields (still editable). Selecting "Guest author" clears them so they can be typed freehand. The current selection is derived from the form state so editing a post with a known team member auto-selects them in the dropdown.
