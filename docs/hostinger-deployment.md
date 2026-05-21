# Hostinger Deployment Guide — FintechPressHub

**Hosting:** Hostinger Node.js Business Plan  
**Deploy method:** GitHub import  
**Node.js required:** 20 or higher  
**Database:** External PostgreSQL — use [Neon](https://neon.tech) (free tier, no credit card)

---

## What You Need Before Starting

| Requirement | Where to get it |
|-------------|-----------------|
| Hostinger Node.js Business Plan | hostinger.com |
| Free Neon PostgreSQL database | [neon.tech](https://neon.tech) — 2 minutes, no credit card |
| Project pushed to a GitHub repository | github.com |
| Resend API key *(optional, for email)* | [resend.com](https://resend.com) — free tier |

> **Why Neon?** Hostinger Business Plan does not include built-in PostgreSQL. Neon provides a free, always-on PostgreSQL database that connects seamlessly to any Node.js app. The free tier is more than enough for this project.

---

## Step 1 — Create a Free Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up (free, no credit card needed)
2. Click **New Project**, name it `fintechpresshub`
3. Choose the region closest to your Hostinger server (e.g. `eu-central-1` for Europe)
4. Once created, go to the **Connection Details** tab
5. Copy the **Connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Save this string — you will need it as `DATABASE_URL`

---

## Step 2 — Push Your Project to GitHub

1. Create a new **private** GitHub repository (e.g. `fintechpresshub`)
2. Push your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/fintechpresshub.git
   git push -u origin main
   ```
3. `.env` is already in `.gitignore` — secrets are never committed

---

## Step 3 — Connect GitHub to Hostinger

1. Log into [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Hosting → Manage** on your Business plan
3. Click **Node.js** in the left sidebar (under **Advanced**)
4. Click **Create Application** (or **Manage** if one already exists)
5. Fill in the application settings:

   | Field | Value |
   |-------|-------|
   | **Application root** | `/home/USERNAME/fintechpresshub` |
   | **Application URL** | `yourdomain.com` |
   | **Startup file** | `artifacts/api-server/dist/index.mjs` |
   | **Node.js version** | `20.x` or higher |

6. Under **Repository** click **Connect to GitHub**, authorise Hostinger, select your repo and the `main` branch
7. Set the **Build command**:
   ```
   npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm run build:hostinger
   ```
   > `build:hostinger` automatically applies any database schema changes **and** builds the full app in one step — no SSH required after updates.
8. Click **Save and Deploy**

Hostinger will auto-redeploy every time you push to `main`. Database migrations run automatically as part of every deploy.

---

## Step 4 — Set Environment Variables

In hPanel → **Node.js** → your app → **Environment Variables**, add the following.

### Required (the app will not start without these)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your full Neon connection string from Step 1 |
| `SITE_URL` | `https://www.yourdomain.com` (no trailing slash, with `https://`) |
| `ADMIN_EMAILS` | Your email address (comma-separated for multiple admins) |
| `ADMIN_PASSWORD` | A strong password — minimum 16 characters |
| `SESSION_SECRET` | Random 64-char hex string (generate command below) |

**Generate SESSION_SECRET** — run this in any terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Recommended (for email notifications)

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) — free tier |
| `REPORT_FROM_EMAIL` | `FintechPressHub <hello@yourdomain.com>` |
| `CONTACT_NOTIFY_TO` | Where contact form emails go |
| `PITCH_RECIPIENT_EMAIL` | Where guest post pitch emails go |

**Alternative — Hostinger Business Mail (SMTP):**

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `hello@yourdomain.com` |
| `SMTP_PASS` | Your Hostinger email password |

### Optional

| Variable | Value |
|----------|-------|
| `INDEXNOW_KEY` | Random 8–128 char alphanumeric string for IndexNow SEO pings |
| `LOCAL_UPLOADS_DIR` | `/home/USERNAME/uploads` — persistent path for uploaded images |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Hostinger Object Storage key (for cloud image uploads) |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Hostinger Object Storage secret |
| `OBJECT_STORAGE_ENDPOINT` | `https://s3.eu-central-1.hostingerapp.com` |
| `OBJECT_STORAGE_BUCKET_NAME` | Your bucket name |
| `OBJECT_STORAGE_REGION` | `eu-central-1` |
| `OBJECT_STORAGE_PUBLIC_URL` | Public URL of your bucket |

> **Do NOT set `PORT`** — Hostinger assigns this automatically.

---

## Step 5 — Apply the Database Schema

The `build:hostinger` command (Step 3) automatically runs the database migration on every deploy — including the very first one. No SSH required.

The server auto-seeds blog posts, authors, services, pricing, and testimonials on first boot.

> **If schema migration fails during build** (e.g. `DATABASE_URL` was not set in hPanel before the first deploy), you can run it manually once via SSH:
> ```bash
> ssh USERNAME@your-server-ip
> cd /home/USERNAME/fintechpresshub
> export DATABASE_URL="postgresql://your-neon-connection-string"
> pnpm --filter @workspace/db run push
> pm2 restart fintechpresshub
> ```

---

## Step 6 — Enable SSL

1. hPanel → **Websites** → your domain → **SSL**
2. Enable **Let's Encrypt** (free, auto-renews every 90 days)
3. Enable **Force HTTPS**
4. Click **Install SSL**

---

## Step 7 — Verify Everything Works

```bash
# Health check — should return {"status":"ok",...}
curl https://www.yourdomain.com/api/healthz

# Homepage — should return HTTP 200
curl -sI https://www.yourdomain.com/ | grep "HTTP"

# Sitemap — should return HTTP 200 with XML
curl -sI https://www.yourdomain.com/sitemap.xml | grep "HTTP"
```

**Admin login:** `https://www.yourdomain.com/admin/login`  
Use your `ADMIN_EMAILS` address + `ADMIN_PASSWORD`

---

## Updating the Application

Push to `main` on GitHub → Hostinger auto-rebuilds and redeploys.

Schema changes are applied automatically on every push — `build:hostinger` runs `db push` before building. No manual SSH migration needed.

---

## GitHub Branch Protection (Recommended)

Block direct pushes to `main` so every change must pass CI before it can deploy. Takes 2 minutes to configure.

### Setup

1. GitHub → your repo → **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main`
3. Enable these options:

| Setting | Value |
|---|---|
| Require a pull request before merging | ✅ ON |
| Require status checks to pass before merging | ✅ ON |
| Require branches to be up to date before merging | ✅ ON |
| Do not allow bypassing the above settings | ✅ ON |

4. Under "Require status checks", add these (names match `.github/workflows/ci.yml`):
   - `typecheck`
   - `build`
   - `test`

> **Note:** If the status checks don't appear in the autocomplete, push a branch and open a PR first — GitHub only shows checks it has seen run at least once.

### Development workflow after protection is on

```bash
git checkout -b feat/my-change
# ... make changes ...
git push origin feat/my-change
# Open PR → CI runs → merge when green → Hostinger deploys automatically
```

Direct `git push origin main` is now rejected by GitHub. Any PR with a failing test, TypeScript error, or Lighthouse regression cannot be merged.

---

## Using a Neon Connection Pooler (Recommended for Production)

Neon's free tier limits direct database connections. Under traffic, you may hit `too many clients` errors. The fix is to use Neon's built-in **connection pooler** instead of the direct connection:

1. In Neon → your project → **Connection Details**
2. Toggle **Connection pooling** to ON
3. Copy the new connection string — it has `-pooler` in the hostname:
   ```
   postgresql://user:pass@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Update `DATABASE_URL` in hPanel → Environment Variables → paste the pooler URL
5. Restart: `pm2 restart fintechpresshub`

The pooler multiplexes hundreds of app connections through a handful of real Postgres connections, eliminating connection exhaustion on the free tier.

---

## Cloudflare CDN (Recommended for Performance & Security)

Put Cloudflare in front of Hostinger for free DDoS protection, global asset CDN, and automatic HTTPS management. Takes ~5 minutes.

1. Sign up at [cloudflare.com](https://cloudflare.com) (free plan)
2. Add your domain → Cloudflare will import your existing DNS records
3. Change your domain's nameservers at your registrar to the two Cloudflare nameservers shown
4. In Cloudflare → **SSL/TLS** → set mode to **Full (strict)**
5. In Cloudflare → **Caching** → **Configuration** → set **Caching Level** to Standard
6. **Optional — Cache Rules:** Create a rule to cache `/assets/*` with `Cache-Control: public, max-age=31536000` to serve hashed JS/CSS from Cloudflare's edge instead of Hostinger

> Hostinger's Nginx is still the origin — Cloudflare just sits in front of it and absorbs traffic globally. Your `SITE_URL` and SSL setup remain unchanged.

---

## Uptime Monitoring (Free)

Set up automated alerts so you know the moment the site goes down, before visitors do.

**Option A — UptimeRobot (free, 5-minute checks):**
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add New Monitor → HTTP(s) → URL: `https://www.yourdomain.com/api/healthz`
3. Set alert contacts (email, Slack, etc.)
4. UptimeRobot pings the endpoint every 5 min and alerts you if it returns non-200

**Option B — Better Stack (free, 30-second checks):**
1. Sign up at [betterstack.com](https://betterstack.com/uptime)
2. Create a monitor → URL: `https://www.yourdomain.com/api/healthz`
3. The `/api/healthz` endpoint returns `{"status":"ok"}` when all systems are healthy

The health endpoint checks the database, email provider, and seed data in one call.

---

## Custom 502 Error Page (Hostinger Nginx)

When your Node.js process is down (deploying, crashing), Nginx shows a plain Hostinger 502 page. Replace it with a branded page:

1. Create a file at `/home/USERNAME/public_html/502.html` with your branded HTML
2. In hPanel → **Hosting** → **Advanced** → **Error Pages** → set a custom 502 page
3. Point it to the file you created

Visitors will see your branded maintenance page instead of the default Hostinger error.

---

## Useful PM2 Commands

```bash
pm2 status                              # list running processes and workers
pm2 logs fintechpresshub               # live log stream (Ctrl+C to stop)
pm2 logs fintechpresshub --lines 200   # last 200 log lines
pm2 restart fintechpresshub            # full restart (brief downtime, both workers)
pm2 reload fintechpresshub             # zero-downtime reload (workers reload one-by-one)
pm2 monit                              # real-time CPU + memory dashboard
pm2 save                               # persist process list across server reboots
pm2 scale fintechpresshub 4            # scale to 4 workers (if your plan has more cores)
```

---

## Troubleshooting

### Site shows 502 Bad Gateway / app won't start

Always start here — the logs tell you exactly what's wrong:
```bash
pm2 logs fintechpresshub --lines 100
```

---

### "FATAL: required env var DATABASE_URL is not set"

**Fix:** Add `DATABASE_URL` in hPanel → Node.js → Environment Variables (paste your Neon connection string), then restart:
```bash
pm2 restart fintechpresshub
```

---

### "password authentication failed" or "connection refused" (database error)

The Neon database may be paused (free tier pauses after 5 minutes of inactivity).

**Fix:**
1. Log into [neon.tech](https://neon.tech) → your project → verify it is active (click **Resume** if paused)
2. Copy the connection string fresh from Neon → Connection Details
3. Update `DATABASE_URL` in hPanel → Environment Variables
4. Restart: `pm2 restart fintechpresshub`

---

### "column does not exist" or "relation does not exist"

The schema migration has not been run yet (or a new update added columns).

**Fix:**
```bash
ssh USERNAME@your-server-ip
cd /home/USERNAME/fintechpresshub
export DATABASE_URL="postgresql://your-neon-connection-string"
pnpm --filter @workspace/db run push
pm2 restart fintechpresshub
```

---

### Admin login says "Email or password is incorrect"

1. Verify `ADMIN_EMAILS` in Environment Variables exactly matches your login email
2. Verify `ADMIN_PASSWORD` is set and is at least 16 characters
3. If the password contains special characters (`$`, `` ` ``, `!`, `#`), wrap it in single quotes via SSH:
   ```bash
   # Edit the .env file directly using single quotes
   echo 'ADMIN_PASSWORD=My$Special#Pass!' >> .env
   ```
4. Restart after any environment variable change: `pm2 restart fintechpresshub`

Admin users are automatically created from `ADMIN_EMAILS` + `ADMIN_PASSWORD` on every server start.

---

### Build fails during GitHub deployment

**Check Node.js version:**
```bash
node --version   # must be v20.0.0 or higher
```
Fix: hPanel → Advanced → Node.js → change version to 20.x

**Check disk space and memory:**
```bash
df -h    # need at least 2 GB free
free -m  # need at least 512 MB free RAM
```

**Run build steps individually to isolate the error:**
```bash
cd /home/USERNAME/fintechpresshub
pnpm --filter @workspace/fintechpresshub run build 2>&1 | tail -30
pnpm --filter @workspace/api-server run build 2>&1 | tail -30
```

**Rebuild manually if auto-deploy fails:**
```bash
cd /home/USERNAME/fintechpresshub
pnpm install --frozen-lockfile
pnpm run build:production
pm2 restart fintechpresshub
```

---

### Contact form / email notifications not sending

Check the health endpoint for the email provider status:
```bash
curl https://www.yourdomain.com/api/healthz
```
Look for `"email":{"ok":false,"provider":"none"}` — means no email provider is configured.

**Fix:** Add `RESEND_API_KEY` **or** the `SMTP_*` variables in hPanel → Environment Variables, then restart.

---

### Site loads but blog posts / content is empty

The database seeding may not have run yet.

**Fix — restart to trigger auto-seed:**
```bash
pm2 restart fintechpresshub
pm2 logs fintechpresshub | grep -i seed
```
Look for: `Seeded empty tables on startup`

If the tables don't exist at all, run the schema push first (see "column does not exist" fix above).

---

### Images / uploads lost after redeploy

Files stored inside the app directory are wiped on every redeploy. Use a persistent directory:

```bash
mkdir -p /home/USERNAME/uploads
chmod 755 /home/USERNAME/uploads
```

Add to hPanel → Environment Variables:
```
LOCAL_UPLOADS_DIR=/home/USERNAME/uploads
```
Restart: `pm2 restart fintechpresshub`

Alternatively, set up Hostinger Object Storage (S3-compatible) using the `OBJECT_STORAGE_*` variables — uploaded files will be stored in the cloud and survive all redeploys.

---

### App crashes repeatedly / keeps restarting

Check real-time resource usage:
```bash
pm2 monit
```

If memory exceeds the limit, edit `ecosystem.config.cjs` (in your app root):
```js
max_memory_restart: "1500M",
```
Then reload: `pm2 reload ecosystem.config.cjs`

---

### SEO routes (sitemap.xml, robots.txt) return 404

Verify `SITE_URL` is set correctly in Environment Variables:
- Format: `https://www.yourdomain.com`
- Must include `https://`
- Must NOT have a trailing slash
- Must match your actual domain exactly

Restart after any change.

---

### HTTPS redirect not working / bare domain not redirecting to www

1. Verify SSL is installed and "Force HTTPS" is enabled (Step 6)
2. Verify `SITE_URL=https://www.yourdomain.com` (with `www.`) in Environment Variables
3. The app automatically 301-redirects `yourdomain.com` → `www.yourdomain.com` in production
4. Restart: `pm2 restart fintechpresshub`

---

## Post-Deployment SEO Checklist

- [ ] `https://www.yourdomain.com/sitemap.xml` returns XML with your blog posts
- [ ] `https://www.yourdomain.com/sitemap_index.xml` returns the sitemap index
- [ ] `https://www.yourdomain.com/robots.txt` looks correct
- [ ] `http://yourdomain.com/` redirects → `https://www.yourdomain.com/` (301)
- [ ] `https://yourdomain.com/` redirects → `https://www.yourdomain.com/` (301)
- [ ] Admin login works at `/admin/login`
- [ ] Contact form submits and sends email notification
- [ ] Blog post page shows correct `<title>` and og:image in browser tab
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Verify security headers at [securityheaders.com](https://securityheaders.com)

---

## Replit-Specific Features (Graceful Degradation on Hostinger)

| Feature | Behaviour on Hostinger | Solution |
|---------|------------------------|----------|
| **Replit OIDC login** (`/api/login`) | Returns 503 (no REPL_ID set) | Use `/admin/login` with your `ADMIN_PASSWORD` |
| **Replit vite dev plugins** | Not loaded (only active when `REPL_ID` is set) | No action needed — production build is unaffected |

Everything else — blog, SEO tools, sitemaps, RSS feeds, contact forms, guest post pitches, admin dashboard, image uploads, newsletters — works identically on Hostinger.
