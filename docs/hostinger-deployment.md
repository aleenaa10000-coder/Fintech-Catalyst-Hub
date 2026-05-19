# Hostinger Deployment Guide — FintechPressHub

**Target:** Hostinger Node.js Business Plan  
**Start command:** `node --enable-source-maps artifacts/api-server/dist/index.mjs`  
**Build command:** `pnpm run build:production`  
**Node.js:** 20+ required

---

## What Goes to Hostinger

This is a **Node.js monorepo**. You upload the full source code, install dependencies on the server, and run the Node.js process. Hostinger's PM2 process manager keeps it alive 24/7.

- The Express server handles all routes — both the API (`/api/*`) and the React frontend as pre-built static files
- PostgreSQL stores all content (blog posts, subscribers, contact forms, etc.)
- A single process serves everything: `node --enable-source-maps artifacts/api-server/dist/index.mjs`

> **What "skill files" are:** The `.agents/skills/` and `.local/skills/` directories are Replit Agent AI assistant tools — they are **not** part of the running application and **do not** need to go to Hostinger. Only the application source code files matter.

---

## Step-by-Step Deployment

### Step 1 — Prepare your Hostinger account

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Make sure you have a **Node.js Business Plan** (required — shared hosting does not support Node.js)
3. Point your domain DNS to Hostinger nameservers if you haven't already

---

### Step 2 — Create PostgreSQL database

1. hPanel → **Databases → PostgreSQL → Create database**
2. Fill in: database name, username, password
3. Note all the details — you'll need them for `DATABASE_URL`
4. Construct your connection string:
   ```
   postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME
   ```
   (On Hostinger, the host is usually `localhost` for same-server databases)

---

### Step 3 — Upload the project files

**Option A — SFTP (recommended)**
1. hPanel → **Files → FTP Accounts** → create FTP/SFTP credentials
2. Use FileZilla or Cyberduck, connect via SFTP
3. Upload `fintechpresshub-deploy.zip` to `/home/USERNAME/`
4. SSH in and extract:
   ```bash
   cd /home/USERNAME
   unzip fintechpresshub-deploy.zip
   mv fintechpresshub-deploy fintechpresshub
   ```

**Option B — SSH + Git (if you have a private Git repo)**
```bash
ssh USERNAME@your-server-ip
git clone https://github.com/you/fintechpresshub.git
```

---

### Step 4 — Install Node.js 20+

1. hPanel → **Hosting → Manage → Node.js**
2. Set **Node.js version** to `20.x` or higher
3. Click **Save**

---

### Step 5 — Set environment variables

**IMPORTANT: Never put real passwords in any file you upload. Use the `.env` file ON the server.**

SSH into your server and create the `.env` file:

```bash
cd /home/USERNAME/fintechpresshub
cp .env.example .env
nano .env
```

Fill in every variable. Critical ones for first launch:

| Variable | Required | Example value |
|----------|----------|---------------|
| `NODE_ENV` | **YES** | `production` |
| `DATABASE_URL` | **YES** | `postgresql://user:pass@localhost:5432/dbname` |
| `SITE_URL` | **YES** | `https://www.yourdomain.com` (no trailing slash) |
| `ADMIN_EMAILS` | **YES** | `your@email.com` |
| `ADMIN_PASSWORD` | **YES** | A strong password (min 16 chars) |
| `SESSION_SECRET` | **YES** | 64-char random hex — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PORT` | NO | Leave blank — Hostinger sets this automatically |
| `RESEND_API_KEY` | for email | Get free from [resend.com](https://resend.com) |
| `REPORT_FROM_EMAIL` | for email | `FintechPressHub <hello@yourdomain.com>` |
| `CONTACT_NOTIFY_TO` | for email | Where contact form emails go |
| `PITCH_RECIPIENT_EMAIL` | for email | Where guest post pitches go |
| `INDEXNOW_KEY` | for SEO | Random 8–128 char string from [indexnow.org](https://www.indexnow.org/) |
| `OBJECT_STORAGE_*` | for uploads | Hostinger Object Storage credentials (see Step 8) |

**Alternative email: SMTP (use Hostinger Business Mail)**
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=hello@yourdomain.com
SMTP_PASS=your-email-password
```

---

### Step 6 — Run the automated install script

SSH into your server and run:

```bash
cd /home/USERNAME/fintechpresshub
chmod +x scripts/hostinger-install.sh
./scripts/hostinger-install.sh
```

This script automatically:
1. Checks Node.js version (must be 20+)
2. Installs pnpm package manager
3. Installs all Node.js dependencies
4. Applies database schema (creates all tables)
5. Builds the production bundle (API + frontend + prerender)
6. Starts the application with PM2

**Or run steps manually if you prefer:**

```bash
# 1. Install pnpm
npm install -g pnpm@latest

# 2. Install dependencies
GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile

# 3. Apply database schema (creates all tables)
source .env && GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push

# 4. Build production bundle
GIT_DIR=/tmp/fakegit pnpm run build:production

# 5. Create logs directory
mkdir -p logs

# 6. Install PM2 process manager
npm install -g pm2

# 7. Start the app
pm2 start ecosystem.config.cjs --env production
pm2 save

# 8. Enable auto-restart on server reboot (follow the output instructions)
pm2 startup
```

---

### Step 7 — Configure Hostinger Node.js application in hPanel

1. hPanel → **Hosting → Manage → Node.js**
2. Click **Create application** (or **Edit** if already created)
3. Set these fields:

   | Field | Value |
   |-------|-------|
   | Application root | `/home/USERNAME/fintechpresshub` |
   | Application URL | `yourdomain.com` |
   | Application startup file | `artifacts/api-server/dist/index.mjs` |
   | Node.js version | `20.x` or higher |

4. Click **Save**

---

### Step 8 — Set up Object Storage for image uploads (recommended)

Without object storage, uploaded images are stored on local disk and **will be lost** if you redeploy. Hostinger Object Storage is S3-compatible and persistent.

1. hPanel → **Object Storage → Create bucket**
2. Name it (e.g., `fintechpresshub-assets`)
3. Create access keys in **Object Storage → Access Keys**
4. Add to `.env`:
   ```
   OBJECT_STORAGE_ACCESS_KEY_ID=your-access-key-id
   OBJECT_STORAGE_SECRET_ACCESS_KEY=your-secret-key
   OBJECT_STORAGE_ENDPOINT=https://s3.eu-central-1.hostingerapp.com
   OBJECT_STORAGE_BUCKET_NAME=fintechpresshub-assets
   OBJECT_STORAGE_REGION=eu-central-1
   OBJECT_STORAGE_PUBLIC_URL=https://fintechpresshub-assets.s3.eu-central-1.hostingerapp.com
   ```

Without object storage, set a persistent uploads directory instead:
```
LOCAL_UPLOADS_DIR=/home/USERNAME/uploads
```
This directory survives deployments as long as you don't delete it.

---

### Step 9 — Enable SSL

1. hPanel → **Websites → SSL**
2. Enable **Let's Encrypt** for your domain (free, auto-renews)
3. Enable **Force HTTPS** redirect

---

### Step 10 — Verify the deployment

```bash
# Homepage returns HTML with <title>
curl -s https://www.yourdomain.com/ | grep "<title"

# API health check returns JSON
curl -s https://www.yourdomain.com/api/healthz

# Sitemap returns XML
curl -sI https://www.yourdomain.com/sitemap.xml | grep "200"

# Admin login works
# Visit: https://www.yourdomain.com/admin/login
```

Live logs:
```bash
pm2 logs fintechpresshub
```

---

## Updating the Application

When you receive an updated version:

```bash
cd /home/USERNAME/fintechpresshub

# 1. Upload new files via SFTP (or git pull)

# 2. Install any new dependencies
GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile

# 3. Apply any database schema changes
source .env && GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push

# 4. Rebuild
GIT_DIR=/tmp/fakegit pnpm run build:production

# 5. Zero-downtime restart
pm2 reload fintechpresshub
```

---

## Useful PM2 Commands

```bash
pm2 status                              # show running processes
pm2 logs fintechpresshub               # live log stream (Ctrl+C to exit)
pm2 logs fintechpresshub --lines 200   # last 200 log lines
pm2 restart fintechpresshub            # restart (brief downtime)
pm2 reload fintechpresshub             # zero-downtime reload
pm2 stop fintechpresshub               # stop the app
pm2 delete fintechpresshub             # remove from PM2
pm2 save                               # save list for auto-start on reboot
pm2 monit                              # real-time CPU/memory dashboard
```

---

## DNS Configuration

Set the following DNS records in hPanel → Domains → DNS Zone:

| Type | Name | Value |
|------|------|-------|
| A | `@` | Hostinger server IP |
| A | `www` | Hostinger server IP |

Enable **Force HTTPS** in hPanel → SSL → Manage. Combined with the `Strict-Transport-Security` header in Express, this gives full HSTS coverage.

---

## Troubleshooting Guide

### Site shows error / won't start

**Always start here:**
```bash
pm2 logs fintechpresshub --lines 100
```

**Missing environment variable** — look for `[startup] FATAL: required env var` in logs
```bash
# Fix: add the missing var to .env, then:
source .env && pm2 restart fintechpresshub
```

**Database connection failure** — look for `ECONNREFUSED` or `authentication failed`
```bash
# Verify DATABASE_URL is correct:
grep DATABASE_URL .env
# Test connection:
psql "$DATABASE_URL" -c "SELECT 1"
```

**Port conflict** — look for `EADDRINUSE`
```bash
# Check what's using the port:
lsof -i :8080
# Change PORT in .env if needed, then restart
```

**Build files missing** — look for `Cannot find module`
```bash
# Check dist exists:
ls artifacts/api-server/dist/
# If empty, rebuild:
GIT_DIR=/tmp/fakegit pnpm run build:production
```

---

### Admin login doesn't work

1. Verify `ADMIN_EMAILS` matches your exact email (case-insensitive)
2. Verify `ADMIN_PASSWORD` is set and doesn't contain shell-special characters (`$`, `` ` ``, `!`)
   - If it does, wrap the value in single quotes in `.env`: `ADMIN_PASSWORD='p@$$w0rd!'`
3. Verify `SESSION_SECRET` is at least 32 characters
4. After changing any env var: `source .env && pm2 restart fintechpresshub`
5. Check logs: `pm2 logs fintechpresshub | grep -i admin`

---

### Images / uploads not working

**Local storage:**
```bash
# Create uploads directory with correct permissions
mkdir -p /home/USERNAME/uploads
chmod 755 /home/USERNAME/uploads
# Set in .env:
# LOCAL_UPLOADS_DIR=/home/USERNAME/uploads
```

**Object Storage errors:**
```bash
pm2 logs fintechpresshub | grep -i "storage\|upload\|S3"
# Verify all OBJECT_STORAGE_* vars are set in .env
```

**Sharp (image processing) errors:**
```bash
pm2 logs fintechpresshub | grep -i sharp
# If errors, reinstall native modules:
GIT_DIR=/tmp/fakegit pnpm install --frozen-lockfile
pm2 restart fintechpresshub
```

---

### Email notifications not sending

1. **Using Resend:** verify `RESEND_API_KEY` is valid and `REPORT_FROM_EMAIL` domain is verified in your Resend dashboard
2. **Using SMTP:** verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are correct
3. Test from admin panel: **Admin → Notifications → Test**
4. Check logs: `pm2 logs fintechpresshub | grep -i email`
5. Check health endpoint: `curl https://yourdomain.com/api/healthz` — reports email transport status

---

### SEO / sitemap not working

```bash
# Test sitemap
curl -sI https://www.yourdomain.com/sitemap.xml
# Test robots.txt
curl -s https://www.yourdomain.com/robots.txt
```

If returning 404: verify `SITE_URL=https://www.yourdomain.com` (exact domain, no trailing slash)

---

### Database errors after deployment

```bash
# "column does not exist" or "relation does not exist":
source .env && GIT_DIR=/tmp/fakegit pnpm --filter @workspace/db run push
pm2 restart fintechpresshub
```

---

### App is slow or keeps restarting

```bash
pm2 monit    # watch CPU and memory in real time
```

If memory approaches 1 GB, increase the limit in `ecosystem.config.cjs`:
```js
max_memory_restart: "1500M",
```
Then: `pm2 reload ecosystem.config.cjs`

---

### Build fails on server

```bash
node --version   # must be 20+
df -h            # need 2+ GB free disk
free -m          # need 512+ MB free RAM

# Run build steps separately to find which one fails:
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/api-server run build 2>&1 | tail -30
GIT_DIR=/tmp/fakegit pnpm --filter @workspace/fintechpresshub run build 2>&1 | tail -30
```

---

## Post-deployment SEO Checklist

- [ ] Visit `https://www.yourdomain.com/sitemap.xml` — should show all blog posts
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify `curl -I http://yourdomain.com/` returns `301 → https://www.yourdomain.com/`
- [ ] Verify security headers: `curl -I https://www.yourdomain.com/ | grep -E "Strict|X-Content|X-Frame"`
- [ ] Test IndexNow by publishing a blog post from the admin dashboard
- [ ] Verify `https://www.yourdomain.com/<INDEXNOW_KEY>.txt` is reachable
- [ ] Verify `https://www.yourdomain.com/llms.txt` returns 200 with text/plain
- [ ] Verify `https://www.yourdomain.com/robots.txt` looks correct

---

## Replit-Only Features (Graceful Degradation on Hostinger)

Two features are Replit-specific and will degrade gracefully on Hostinger:

| Feature | Behaviour on Hostinger | Fix |
|---------|------------------------|-----|
| **Replit OIDC login** | Login via Replit Google OAuth unavailable | Use `/admin/login` with `ADMIN_PASSWORD` instead — this is the standard path on Hostinger |
| **Replit Object Storage** | Upload button shows "storage unavailable" error | Set `OBJECT_STORAGE_*` vars (Hostinger S3-compatible Object Storage) or `LOCAL_UPLOADS_DIR` |

Everything else works identically on Hostinger: blog, SEO, tools, contact forms, newsletter, admin dashboard, notifications.

---

## File Structure After Deployment

```
/home/USERNAME/fintechpresshub/
├── artifacts/
│   ├── api-server/
│   │   ├── dist/             ← compiled Express server (the running app)
│   │   └── src/              ← source code
│   └── fintechpresshub/
│       ├── dist/public/      ← compiled React frontend (served as static files)
│       └── src/              ← source code
├── lib/
│   └── db/                   ← database schema (used by drizzle push)
├── scripts/
│   └── hostinger-install.sh  ← automated setup script
├── ecosystem.config.cjs       ← PM2 configuration
├── .env                       ← your environment variables (NEVER commit this)
├── .env.example               ← template with all variables documented
├── package.json
├── pnpm-lock.yaml
└── logs/                      ← PM2 log files (created by install script)
```
