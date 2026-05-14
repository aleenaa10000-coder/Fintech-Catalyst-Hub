# Hostinger Deployment Guide — FintechPressHub

**Target:** Hostinger Node.js Business Plan  
**Start command:** `node artifacts/api-server/dist/index.mjs`  
**Build command:** `pnpm run build:production`

---

## Prerequisites

- Node.js 20+ (select in hPanel → Node.js → Node version)
- PostgreSQL database provisioned (hPanel → Databases → PostgreSQL)
- Domain pointed to Hostinger nameservers with SSL enabled

---

## Step-by-Step Deployment

### 1. Create the Node.js application in hPanel

1. hPanel → Hosting → Manage → Node.js
2. Click **Create application**
3. Set **Application root**: `/` (project root)
4. Set **Application URL**: `www.fintechpresshub.com`
5. Set **Application startup file**: `artifacts/api-server/dist/index.mjs`
6. Node version: **20.x** or higher

### 2. Provision PostgreSQL

1. hPanel → Databases → PostgreSQL → Create database
2. Note the host, port, username, password, and database name
3. Construct your `DATABASE_URL`:
   ```
   postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
   ```

### 3. Set environment variables

In hPanel → Node.js application → Environment variables, add every variable from `.env.example`. The critical ones for a first deploy:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Enables www redirect, security headers, static file serving |
| `DATABASE_URL` | `postgresql://...` | Full connection string from step 2 |
| `SITE_URL` | `https://www.fintechpresshub.com` | No trailing slash |
| `ADMIN_EMAILS` | `you@example.com` | Comma-separated admin emails |
| `SESSION_SECRET` | 64-char random hex | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `RESEND_API_KEY` | `re_...` | From resend.com |
| `REPORT_FROM_EMAIL` | `FintechPressHub <hello@fintechpresshub.com>` | Must be a verified Resend domain |
| `CONTACT_NOTIFY_TO` | `hello@fintechpresshub.com` | Contact form destination |
| `PITCH_RECIPIENT_EMAIL` | `editorial@fintechpresshub.com` | Guest post pitch destination |
| `INDEXNOW_KEY` | `your-key` | Random alphanumeric string |
| `PORT` | *(leave blank)* | Hostinger sets this automatically |

### 4. Upload and build

Connect via SSH or use Hostinger's File Manager to upload the project, then run:

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run database migrations
pnpm --filter @workspace/db run push

# Build API server + frontend + prerender
pnpm run build:production
```

The build command sequence is:
1. `pnpm --filter @workspace/api-server run build` — compiles the Express server to `artifacts/api-server/dist/`
2. `pnpm --filter @workspace/fintechpresshub run build` — runs Vite build + `prerender.mjs`

### 5. Start the application

hPanel will start the app automatically using the startup file you set in step 1:

```
node artifacts/api-server/dist/index.mjs
```

The server:
- Listens on `PORT` (set by Hostinger)
- Serves the Express API at `/api/*`
- Serves the pre-rendered frontend from `artifacts/fintechpresshub/dist/public/`
- Redirects bare-domain (non-www) traffic to www with 301
- Adds security headers on every response

### 6. Verify the deployment

```bash
# Should return 200 with JSON
curl -s https://www.fintechpresshub.com/api/healthz

# Should return the sitemap with blog post image extensions
curl -s https://www.fintechpresshub.com/sitemap.xml | head -30

# Should return pre-rendered HTML with <title> tag (not blank shell)
curl -s https://www.fintechpresshub.com/ | grep "<title"

# Confirm www redirect is working (non-www → www with 301)
curl -I http://fintechpresshub.com/
```

---

## DNS Configuration

Set the following DNS records in hPanel → Domains → DNS Zone:

| Type | Name | Value |
|------|------|-------|
| A | `@` | Hostinger server IP |
| A | `www` | Hostinger server IP |
| CNAME | `mail` | *(Hostinger mail server)* |

Enable **Force HTTPS** in hPanel → SSL → Manage. This combined with the `Strict-Transport-Security` header in Express gives full HSTS coverage.

---

## Post-deployment SEO checklist

- [ ] Verify `https://www.fintechpresshub.com/sitemap.xml` loads and contains blog posts with `<image:image>` elements
- [ ] Submit sitemap to Google Search Console: `https://www.fintechpresshub.com/sitemap.xml`
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify `https://www.fintechpresshub.com/robots.txt` shows AI crawler differentiation
- [ ] Confirm `curl -I http://fintechpresshub.com/` returns `301 → https://www.fintechpresshub.com/`
- [ ] Confirm security headers with: `curl -I https://www.fintechpresshub.com/ | grep -E "Strict|X-Content|X-Frame|Referrer"`
- [ ] Test IndexNow by publishing a new blog post from the admin dashboard
- [ ] Submit `https://www.fintechpresshub.com/<INDEXNOW_KEY>.txt` to indexnow.org

---

## Troubleshooting

**App won't start:** Check that `artifacts/api-server/dist/index.mjs` exists (run the build first). Verify `DATABASE_URL` is set — the server will crash on startup if it can't connect to Postgres.

**Blank pages / no content:** The frontend builds to `artifacts/fintechpresshub/dist/public/`. Confirm this directory exists and contains `index.html`. If it's missing, the Vite build failed — check build logs.

**Admin login not working:** On Hostinger, Replit OIDC auth is unavailable. Use `/admin/login` with the `ADMIN_PASSWORD` set in environment variables.

**Emails not sending:** Verify `RESEND_API_KEY` is set and the `REPORT_FROM_EMAIL` domain is verified in your Resend dashboard. Check `/api/healthz` — it reports email transport status.

**www redirect loop:** Ensure `NODE_ENV=production` is set. The redirect middleware only activates in production to avoid interfering with Replit dev previews.

---

## GEO-related Hostinger checks (added 2026-05-14)

The full GEO posture is documented in `docs/geo-audit-report-2026-05.md`. The two
Hostinger-specific items that affect generative-engine discoverability and that
must be verified post-deployment are:

1. **`/llms.txt` and `/llms-full.txt` must be reachable.** They are served by
   `artifacts/api-server/src/routes/llmsTxt.ts` and require no extra
   configuration beyond `SITE_URL` being set so the absolute URLs inside the
   Markdown match the production hostname. After deploy, verify with:
   ```
   curl -sI https://www.fintechpresshub.com/llms.txt | grep -E "200|text/plain"
   curl -sI https://www.fintechpresshub.com/llms-full.txt | grep -E "200|text/plain"
   ```

2. **Every HTML page must emit the `Link: rel="alternate"; type="text/plain"`
   header** that points AI crawlers at the LLM content index. The header is
   set by `ssrMeta.ts` and survives any reverse-proxy hop. Verify with:
   ```
   curl -sI https://www.fintechpresshub.com/ | grep -i "^link:"
   ```
   The expected output includes `</llms.txt>; rel="alternate"; type="text/plain"`.

3. **Object-storage uploads on Hostinger.** The Replit Object Storage sidecar
   is unavailable. `lib/object-storage/objectStorage.ts` already gates every
   public method behind `isReplitStorageAvailable()` and throws a friendly
   error when `REPL_ID` is unset, so the server boots cleanly. *Existing*
   uploads served from `/objects/*` continue to work because they are read
   from the storage URL stored in the DB row, not re-uploaded. *New* uploads
   from the admin dashboard (cover images, author photos) will fail with a
   "Replit Object Storage required" error until an S3-compatible adapter is
   wired in. For an interim Hostinger deployment, upload assets directly to
   `artifacts/fintechpresshub/public/author-photos/` and reference them by
   relative path in the admin UI — the existing `/objects/*` route already
   transparently passes through to the public folder when the sidecar is
   absent.

4. **Skill-Creator outputs are runtime-independent.** All skills under
   `.local/skills/` and `.agents/skills/` are static Markdown plus optional
   shell scripts; none depend on Replit-only services. They will continue to
   function on Hostinger because the agent runtime that consumes them is not
   part of this deployment artefact.
