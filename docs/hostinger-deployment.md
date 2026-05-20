# Hostinger Deployment Guide — FintechPressHub

**Hosting:** Hostinger Node.js Business Plan  
**Deploy method:** GitHub import (recommended)  
**Node.js required:** 20 or higher  
**Database:** External PostgreSQL — use [Neon](https://neon.tech) (free tier)

---

## What You Need Before Starting

- A **Hostinger Node.js Business Plan** (shared hosting does NOT support Node.js)
- A **free Neon PostgreSQL database** — sign up at [neon.tech](https://neon.tech) (2 minutes, no credit card)
- Your project **pushed to a GitHub repository**
- A **Resend API key** (optional but recommended for emails — free at [resend.com](https://resend.com))

> **Why Neon?** Hostinger Business Plan does not include a built-in PostgreSQL database. Neon provides a free, fast PostgreSQL database that connects seamlessly to any Node.js app.

---

## Step 1 — Create a Free Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up (free, no credit card needed)
2. Click **New Project**, name it `fintechpresshub`
3. Choose the region closest to your Hostinger server
4. Once created, go to the **Connection Details** tab
5. Copy the **Connection string** — it looks like:
   ```
   postgresql://username:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Save this — you'll need it as your `DATABASE_URL`

---

## Step 2 — Push Your Project to GitHub

1. Create a new **private** GitHub repository (e.g. `fintechpresshub`)
2. Push your project code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/fintechpresshub.git
   git push -u origin main
   ```
3. `.env` is already in `.gitignore` — never commit real secrets to GitHub

---

## Step 3 — Connect GitHub to Hostinger

1. Log into [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Hosting → Manage** on your Business plan
3. Click **Node.js** in the left sidebar (under **Advanced**)
4. Click **Create Application** (or **Manage** if one already exists)
5. Fill in:

   | Field | Value |
   |-------|-------|
   | **Application root** | `/home/USERNAME/fintechpresshub` |
   | **Application URL** | `yourdomain.com` |
   | **Startup file** | `artifacts/api-server/dist/index.mjs` |
   | **Node.js version** | `20.x` or higher |

6. Under **Repository** click **Connect to GitHub**, authorize Hostinger, select your repo and `main` branch
7. Set the **Build command**:
   ```
   npm install -g pnpm@10 && GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile && GIT_DIR=/tmp/fakegit pnpm run build:production
   ```
8. Click **Save and Deploy**

> Hostinger will now auto-redeploy every time you push to `main`.

---

## Step 4 — Set Environment Variables

In hPanel → **Node.js** → your app → **Environment Variables**, add:

### Required (the app will not start without these)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your full Neon connection string from Step 1 |
| `SITE_URL` | `https://www.yourdomain.com` (no trailing slash) |
| `ADMIN_EMAILS` | Your email address (comma-separated for multiple) |
| `ADMIN_PASSWORD` | A strong password — min 16 characters |
| `SESSION_SECRET` | Random 64-char hex string (generate below) |

**Generate SESSION_SECRET** — run this in any terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Recommended (for email notifications)

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) — free tier available |
| `REPORT_FROM_EMAIL` | `FintechPressHub <hello@yourdomain.com>` |
| `CONTACT_NOTIFY_TO` | Where contact form emails go |
| `PITCH_RECIPIENT_EMAIL` | Where guest post pitch emails go |

**Alternative — use Hostinger Business Mail (SMTP) instead of Resend:**

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `hello@yourdomain.com` |
| `SMTP_PASS` | Your Hostinger email password |

### Optional

| Variable | Value |
|----------|-------|
| `INDEXNOW_KEY` | Random 8–128 char string for Bing/Yandex SEO pings |
| `LOCAL_UPLOADS_DIR` | `/home/USERNAME/uploads` (persistent path for uploaded images) |

> **Do NOT set `PORT`** — Hostinger sets this automatically.

---

## Step 5 — Apply the Database Schema (One Time)

After the first deployment, SSH into your server to create all tables:

**Get SSH credentials:** hPanel → **Advanced** → **SSH Access**

```bash
# SSH into your server
ssh USERNAME@your-server-ip

# Go to your app directory
cd /home/USERNAME/fintechpresshub

# Apply the database schema (creates all tables)
export DATABASE_URL="postgresql://your-neon-connection-string"
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push

# Restart the app (it auto-seeds demo content on first boot)
pm2 restart fintechpresshub
```

The server auto-seeds blog posts, authors, services, pricing, and testimonials on first boot.

---

## Step 6 — Enable SSL

1. hPanel → **Websites** → your domain → **SSL**
2. Enable **Let's Encrypt** (free, auto-renews)
3. Enable **Force HTTPS**
4. Click **Install SSL**

---

## Step 7 — Verify Everything Works

```bash
# Health check — should return {"status":"ok",...}
curl https://www.yourdomain.com/api/healthz

# Homepage
curl -sI https://www.yourdomain.com/ | grep "200"

# Sitemap
curl -sI https://www.yourdomain.com/sitemap.xml | grep "200"
```

**Admin login:** visit `https://www.yourdomain.com/admin/login`  
Use your `ADMIN_EMAILS` address + `ADMIN_PASSWORD`

---

## Updating the Application

Push to `main` on GitHub → Hostinger auto-rebuilds and redeploys.

If a new update adds database schema changes, apply them after deployment:
```bash
ssh USERNAME@your-server-ip
cd /home/USERNAME/fintechpresshub
export DATABASE_URL="postgresql://your-neon-connection-string"
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push
pm2 reload fintechpresshub
```

---

## Useful PM2 Commands

```bash
pm2 status                              # list running processes
pm2 logs fintechpresshub               # live log stream (Ctrl+C to stop)
pm2 logs fintechpresshub --lines 200   # last 200 log lines
pm2 restart fintechpresshub            # full restart
pm2 reload fintechpresshub             # zero-downtime reload
pm2 monit                              # real-time CPU + memory dashboard
pm2 save                               # persist process list across reboots
```

---

## Troubleshooting

### Site shows 502 / won't start

Always start here:
```bash
pm2 logs fintechpresshub --lines 100
```

---

### "FATAL: required env var DATABASE_URL is not set"

**Fix:** Add `DATABASE_URL` in hPanel → Environment Variables (your Neon connection string), then restart.

---

### "password authentication failed" or "connection refused"

The Neon database may be paused (free tier pauses after inactivity).

**Fix:**
1. Log into [neon.tech](https://neon.tech) → your project → verify it's active (click **Resume** if paused)
2. Copy the connection string fresh from Neon
3. Update `DATABASE_URL` in hPanel → Environment Variables
4. Restart: `pm2 restart fintechpresshub`

---

### "column does not exist" or "relation does not exist"

Schema migration hasn't run yet.

**Fix:**
```bash
ssh USERNAME@your-server-ip
cd /home/USERNAME/fintechpresshub
export DATABASE_URL="postgresql://your-neon-connection-string"
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push
pm2 restart fintechpresshub
```

---

### Admin login says "Email or password is incorrect"

1. Verify `ADMIN_EMAILS` in Environment Variables matches your exact email
2. Verify `ADMIN_PASSWORD` is set
3. If password has special chars (`$`, `` ` ``, `!`), set it via SSH in `.env` with single quotes: `ADMIN_PASSWORD='My$Pass!'`
4. Restart the app after any env change: `pm2 restart fintechpresshub`

The admin user is auto-created from `ADMIN_EMAILS` + `ADMIN_PASSWORD` on every startup.

---

### Build fails during deployment

**Check Node.js version:**
```bash
node --version  # must be v20.0.0 or higher
```
Fix: hPanel → Advanced → Node.js → set version to 20.x

**Check disk/memory:**
```bash
df -h    # need 2+ GB free
free -m  # need 512+ MB free RAM
```

**Run build steps individually to find the error:**
```bash
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/api-server run build 2>&1 | tail -30
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/fintechpresshub run build 2>&1 | tail -30
```

---

### Contact form emails not sending

Check health endpoint:
```bash
curl https://www.yourdomain.com/api/healthz
```
Look for `"email":{"ok":false,"provider":"none"}` — means no email provider is configured.

**Fix:** Add `RESEND_API_KEY` or the `SMTP_*` variables in hPanel → Environment Variables, then restart.

---

### Site loads but no blog posts / empty content

**Fix — restart to trigger auto-seed:**
```bash
pm2 restart fintechpresshub
pm2 logs fintechpresshub | grep -i seed
```

Look for: `Seeded empty tables on startup`

---

### Images / uploads not working after redeploy

Files stored in the app directory are wiped on redeploy. Use a persistent path:

```bash
mkdir -p /home/USERNAME/uploads
chmod 755 /home/USERNAME/uploads
```

Add to hPanel → Environment Variables:
```
LOCAL_UPLOADS_DIR=/home/USERNAME/uploads
```
Restart: `pm2 restart fintechpresshub`

---

### App keeps restarting / crashing in a loop

```bash
pm2 monit   # real-time CPU/memory
```

If memory is near 1 GB limit, increase it in `ecosystem.config.cjs`:
```js
max_memory_restart: "1500M",
```
Then: `pm2 reload ecosystem.config.cjs`

---

### SEO routes (sitemap, robots.txt) return 404

Verify `SITE_URL=https://www.yourdomain.com` (exact domain, `https://`, no trailing slash) in Environment Variables. Restart after any change.

---

## Post-Deployment SEO Checklist

- [ ] `https://www.yourdomain.com/sitemap.xml` returns XML with your blog posts
- [ ] `https://www.yourdomain.com/robots.txt` looks correct
- [ ] `http://yourdomain.com/` redirects → `https://www.yourdomain.com/` (301)
- [ ] Admin login works at `/admin/login`
- [ ] Contact form submits without error
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Check security headers at [securityheaders.com](https://securityheaders.com)

---

## Replit-Specific Features (Graceful Degradation on Hostinger)

| Feature | On Hostinger | Solution |
|---------|-------------|----------|
| **Replit OIDC login** (`/api/login`) | Returns 503 gracefully | Use `/admin/login` with `ADMIN_PASSWORD` instead |
| **Replit Object Storage** | Not available | Set `LOCAL_UPLOADS_DIR` to a persistent path |

Everything else — blog, SEO tools, sitemaps, RSS, contact forms, admin dashboard — works identically on Hostinger.
