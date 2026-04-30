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
