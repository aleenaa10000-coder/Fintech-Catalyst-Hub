# FintechPressHub

## Overview

Professional fintech digital marketing & content agency website. React + Vite + Tailwind frontend, Express API backend, PostgreSQL database via Drizzle ORM.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node 24
- **Frontend**: React + Vite + Tailwind + shadcn/ui + framer-motion + wouter (in `artifacts/fintechpresshub`)
- **Backend**: Express 5 (in `artifacts/api-server`) — routes for blog, services, pricing, testimonials, trust stats, contact form, guest post submissions
- **Database**: PostgreSQL + Drizzle ORM (schemas in `lib/db/src/schema`)
- **API contract**: OpenAPI in `lib/api-spec/openapi.yaml` — codegen produces React Query hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`)
- **Seed**: `pnpm --filter @workspace/scripts run seed`

## Pages

Home, About, Services, Pricing, Blog (+ post detail), Authors index (`/authors`) + author profile (`/authors/:slug`), Write For Us, Contact, Privacy Policy, Refund Policy, Terms, Editorial Guidelines, 404.

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

## Hosting

User intends to host the final site on Hostinger Business plan. Frontend builds to a static bundle (`pnpm --filter @workspace/fintechpresshub run build` → `dist/public`) suitable for Hostinger's static hosting; the Node Express API can be hosted via Hostinger's Node.js app feature or any Node host pointed to from the same domain.

## Email (contact form)

- `artifacts/api-server/src/lib/mailer.ts` — nodemailer transporter (cached, secure mode auto-picked for port 465; no-ops with warning if SMTP creds missing).
- `POST /api/contact` sends two emails async (non-blocking on the response):
  1. Notification to `CONTACT_NOTIFY_TO` with `replyTo` set to the submitter.
  2. Branded auto-reply confirmation to the submitter.
- Secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_NOTIFY_TO`.

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
