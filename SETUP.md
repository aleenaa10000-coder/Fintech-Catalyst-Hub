# Setup Guide — After Importing from GitHub

Follow these steps once after importing this repository into a new Replit account. The whole process takes about 5 minutes.

## 1. Provision the database

Open the **Database** tool in the left sidebar and click **Create a database** (PostgreSQL). Replit automatically sets the `DATABASE_URL` environment variable for you — no manual copying required.

Without this step the API server will fail to start and the site will load with empty content.

## 2. Add secrets

Open the **Secrets** tool in the left sidebar and add the values from `.env.example`. The minimum required for a working preview is just the database (already done in step 1). Add the rest only for the features you plan to use:

| Secret | Required for |
| --- | --- |
| `RESEND_API_KEY` | Sending contact-form and pitch emails (Resend) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Sending email via SMTP instead of Resend |
| `REPORT_FROM_EMAIL` | "From" address on outgoing emails |
| `ADMIN_EMAILS` | Comma-separated list of admin notification recipients |
| `CONTACT_NOTIFY_TO` | Recipient for contact-form submissions |
| `PITCH_RECIPIENT_EMAIL` | Recipient for guest-post pitch submissions |
| `INDEXNOW_KEY` | Auto-pinging Bing/Yandex when blog posts publish (production only) |
| `SITE_URL` | Canonical production URL used in sitemaps and emails |

## 3. Click Run

Press the green **Run** button at the top of the workspace. Replit reads the three `artifact.toml` files and starts all three services automatically:

| Service | Port | Purpose |
| --- | --- | --- |
| FintechPressHub (web) | 5000 | The public-facing site — also drives the default preview |
| API Server | 8080 | Express backend, blog data, forms, scheduled jobs |
| Mockup Sandbox | 8081 | Canvas component previews (development only) |

The first run installs dependencies, applies database migrations, and seeds demo content (blog posts, authors, services, pricing, testimonials). This takes about 60–90 seconds; subsequent starts are nearly instant.

## 4. Open the preview

Once the **FintechPressHub: web** workflow logs `ready in …`, the preview pane on the right will show the site. The canvas iframes will also fill in automatically.

If a preview shows **"Hmm… We couldn't reach this app"**, the workflow simply hasn't finished starting — wait a few seconds and refresh.

## 5. Verify the import

You have two equivalent ways to check that the database, email provider, and seed content are all wired up correctly. Pick whichever is more convenient.

### ▶ Run setup checks (terminal — recommended)

Open the **Shell** tool and run:

```bash
pnpm run setup:check
```

This runs a small CLI that prints the same report `/api/healthz` returns, but directly in the terminal — no need to start the API server or open a browser. You'll see something like:

```
FintechPressHub — Setup Check
Same checks as the /api/healthz endpoint.

PASS Database
       connected · 24ms round-trip
PASS Email provider
       provider: resend
PASS Seed data
       blogPosts=15  authors=11  services=5  testimonials=4  pricingPlans=3  siteStats=1

Overall: OK  (checked at 2026-04-30T17:54:30.936Z)
```

The command exits with code `0` when everything is healthy and `1` when at least one check is degraded — handy for CI/automation.

### Or: open the health endpoint in a browser

Open `/api/healthz` in a new tab (e.g. `https://<your-repl>.replit.dev/api/healthz`) — or run `curl http://localhost:8080/api/healthz` from the Shell — and you'll get the same data as JSON:

```json
{
  "status": "ok",
  "db":       { "ok": true,  "latencyMs": 1 },
  "email":    { "ok": true,  "provider": "resend" },
  "seedData": { "ok": true,  "counts": { "blogPosts": 15, "authors": 11, "services": 5, "testimonials": 4, "pricingPlans": 3, "siteStats": 1 } },
  "uptimeSeconds": 12,
  "checkedAt": "2026-04-30T16:58:18.493Z"
}
```

- `status` is `"ok"` only when **db**, **email**, and **seedData** all pass; otherwise it is `"degraded"` and the failing block tells you exactly which step is missing.
- `email.provider` will be `"none"` until you add `RESEND_API_KEY` or the `SMTP_*` secrets — useful for confirming step 2 worked.
- `seedData.counts` lets you confirm the demo content was inserted; if any value is `0`, restart the API Server workflow to re-run the seed.

---

---

## Deploying to Hostinger (Node.js Business plan)

This project can run as a single Node.js process on Hostinger. The API server serves both the JSON API and the pre-built React frontend from the same port.

### 1. Push the repository to GitHub

If you haven't already, push your Replit project to a GitHub repository. Hostinger can deploy directly from a GitHub branch.

### 2. Set up a PostgreSQL database

Create an external PostgreSQL database (e.g. Supabase free tier, Neon, or Railway) and copy the connection string. Hostinger's Business plan does not include built-in Postgres, so an external provider is required.

### 3. Configure environment variables in Hostinger

In your Hostinger Node.js app panel → **Environment variables**, add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your Postgres connection string |
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://www.yourdomain.com` (no trailing slash) |
| `RESEND_API_KEY` | Your Resend API key (for contact/pitch emails) |
| `REPORT_FROM_EMAIL` | `FintechPressHub <hello@yourdomain.com>` |
| `PITCH_RECIPIENT_EMAIL` | Recipient for guest-post pitch submissions |
| `CONTACT_NOTIFY_TO` | Recipient for contact-form submissions |
| `INDEXNOW_KEY` | Your IndexNow key (optional, for Bing/Yandex pings) |

Leave `REPL_ID` unset — auth is Replit-specific and the site functions fully without it. The `/api/login` route returns a friendly 503 instead of crashing.

`PORT` is set automatically by Hostinger — do not add it manually.

### 4. Set the build command

In Hostinger's Node.js app settings, set:

| Setting | Value |
| --- | --- |
| **Build command** | `pnpm install && pnpm run build:production` |
| **Start command** | `pnpm start` |
| **Node version** | 20 or higher |

`build:production` compiles the React frontend to `artifacts/fintechpresshub/dist/public` and then bundles the Express API server to `artifacts/api-server/dist/index.mjs`.

`pnpm start` runs the API server, which — when `NODE_ENV=production` — automatically detects the built frontend and serves it as static files with a SPA fallback for all non-API routes.

### 5. Push the schema and seed data

After the first deploy, run a one-time migration from the Hostinger terminal (or via SSH):

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
```

This creates all database tables and seeds demo content (blog posts, authors, services, pricing, testimonials).

### 6. Verify

Visit `https://www.yourdomain.com/api/healthz` — you should see:

```json
{ "status": "ok", "db": { "ok": true }, "email": { "ok": true }, "seedData": { "ok": true } }
```

If `db.ok` is `false`, double-check the `DATABASE_URL` value. If `email.ok` is `false`, add `RESEND_API_KEY` or the `SMTP_*` variables.

### Notes

- **Admin blog** (`/admin/blog`) requires Replit authentication and is not available on Hostinger. Manage blog posts directly in the database, or publish from a Replit workspace and let the same `DATABASE_URL` share data between environments.
- **Object storage** (cover image uploads) uses Replit's built-in object store and is unavailable on Hostinger unless you swap the storage backend for AWS S3 or similar.
- The Vite dev server is not started in production. All frontend traffic is served as static files by Express from `artifacts/fintechpresshub/dist/public`.

---

## Optional: make the post-merge script executable

The repository ships with `scripts/post-merge.sh`, which Replit runs automatically after task-agent merges to keep dependencies and the database in sync. If you ever see permission errors when this script runs, mark it executable once and commit:

```bash
git update-index --chmod=+x scripts/post-merge.sh
git commit -m "Make post-merge script executable"
git push
```

## Troubleshooting

- **Empty blog / no data showing** — the database wasn't provisioned (step 1) or migrations haven't run yet. Restart the **API Server** workflow; it re-runs migrations and seeds on startup.
- **Contact form returns an error** — no email provider is configured. Add either `RESEND_API_KEY` or the `SMTP_*` secrets.
- **Default preview shows "couldn't reach this app"** — the **FintechPressHub: web** workflow isn't running. Open the Workflows pane and start it.
- **Port already in use** — stop any other workflow that might be bound to port 5000, 8080, or 8081, then restart.
