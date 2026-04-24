# FintechPressHub

Professional fintech digital marketing & content agency website. React + Vite frontend, Express API backend, PostgreSQL via Drizzle ORM, all in a pnpm monorepo.

---

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node 24
- **Frontend**: React 19 + Vite + Tailwind 4 + shadcn/ui + framer-motion + wouter — `artifacts/fintechpresshub`
- **Backend**: Express 5 — `artifacts/api-server` (routes for blog, services, pricing, testimonials, trust stats, contact form, guest post submissions, newsletter)
- **Database**: PostgreSQL + Drizzle ORM — schemas in `lib/db/src/schema`
- **API contract**: OpenAPI in `lib/api-spec/openapi.yaml`. Codegen produces typed React Query hooks (`@workspace/api-client-react`) and Zod schemas (`@workspace/api-zod`)

---

## Quick start (Replit)

When you import this repo into Replit (or fork it from another Replit account), Replit reads `.replit` and configures Node 24 + PostgreSQL automatically. To get running:

1. **Provision the database** — open the **Database** tool in the left sidebar and create a Replit PostgreSQL database. The `DATABASE_URL` secret is added automatically.
2. **Add any other secrets you need** (see [Environment variables](#environment-variables) below). The SMTP variables are only required if you want pitch-submission emails to send.
3. **Install dependencies** — usually automatic on first open. If not, run:
   ```bash
   pnpm install
   ```
4. **Push the database schema** — creates all tables described in `lib/db/src/schema`:
   ```bash
   pnpm --filter @workspace/db run push
   ```
5. **(Optional) Seed demo content** — services, pricing plans, testimonials, etc.:
   ```bash
   pnpm --filter @workspace/scripts run seed
   ```
6. **Click Run.** The `Project` workflow starts both the API Server and the frontend in parallel.

That's it — the preview pane will show the home page.

---

## Quick start (local development)

If you'd rather run this on your own machine:

```bash
# 1. Use Node 24 and pnpm 10
node -v   # v24.x
pnpm -v   # 10.x

# 2. Install dependencies
pnpm install

# 3. Copy the env template and fill it in (at minimum DATABASE_URL)
cp .env.example .env
# edit .env

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. (Optional) seed demo content
pnpm --filter @workspace/scripts run seed

# 6. Run the API and the frontend in two terminals
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fintechpresshub run dev
```

The frontend is served on the port you set, and `/api/*` requests are proxied to the API server (see `artifacts/fintechpresshub/vite.config.ts`).

---

## Environment variables

See [`.env.example`](./.env.example) for the full template. Required vs. optional:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `PORT` | Yes | Port for the API server (and separately the frontend dev server) |
| `NODE_ENV` | Recommended | `development` \| `production` |
| `API_PROXY_TARGET` | Optional | Override for the Vite dev proxy → API URL (default `http://127.0.0.1:8080`) |
| `BASE_PATH` | Optional | Base path for the frontend (default `/`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional | Outgoing email for guest-post submissions |
| `PITCH_RECIPIENT_EMAIL` | Optional | Inbox that receives editorial pitch notifications |

On Replit, set these in the **Secrets** pane. Locally, set them in `.env` (which is gitignored).

---

## Project structure

```
.
├── artifacts/
│   ├── api-server/         # Express 5 API (TypeScript)
│   └── fintechpresshub/    # React + Vite frontend
├── lib/
│   ├── api-client-react/   # Generated React Query hooks (do not hand-edit)
│   ├── api-spec/           # OpenAPI YAML — source of truth for the API
│   ├── api-zod/            # Generated Zod schemas (do not hand-edit)
│   └── db/                 # Drizzle ORM schema + DB client
├── scripts/                # One-off scripts (seed, hello)
├── pnpm-workspace.yaml
├── package.json
└── .replit                 # Replit workflow + module config
```

---

## Common commands

```bash
# Type-check the entire monorepo
pnpm run typecheck

# Build everything (typecheck + per-package build)
pnpm run build

# Regenerate API client + Zod schemas from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push the Drizzle schema to the database (dev)
pnpm --filter @workspace/db run push

# Seed demo content
pnpm --filter @workspace/scripts run seed
```

---

## Pages

Home, About, Services, Pricing, Blog (+ post detail), Write For Us, Contact, Privacy Policy, Refund Policy, Cookie Policy, Terms of Service, Editorial Guidelines, 404.

---

## Deploying

- **On Replit** — click **Deploy** in the workspace. The autoscale deployment is configured in `.replit` under `[deployment]`.
- **Self-hosted** — `pnpm run build` produces a static frontend bundle in `artifacts/fintechpresshub/dist/public` (suitable for Hostinger / any static host) and a built API server in `artifacts/api-server/dist`.

---

## Notes for re-importing this repo into another Replit account

1. Use **Create Repl → Import from GitHub** and point at the GitHub URL.
2. After the import finishes, follow the [Quick start (Replit)](#quick-start-replit) steps. The two things Replit can't import for you are the **database** (provision a fresh one) and **secrets** (re-enter from `.env.example`).
3. If you want the same content visible on day one, run the seed script in step 5.
