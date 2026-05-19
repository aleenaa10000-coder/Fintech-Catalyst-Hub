/**
 * PM2 ecosystem configuration for Hostinger VPS deployment.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs          # start / restart
 *   pm2 reload ecosystem.config.cjs         # zero-downtime reload
 *   pm2 save                                # persist process list across reboots
 *   pm2 startup                             # generate systemd/init.d boot hook
 *
 * Environment-specific overrides go in the env_production block below.
 * Secret values (DATABASE_URL, SESSION_SECRET, etc.) should be exported
 * from the server's shell profile (~/.bashrc or /etc/environment) so they
 * are never committed to version control.
 */

module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || "fintechpresshub",
      script: "artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      env: {
        NODE_ENV: "development",
        PORT: "8080",
      },

      env_production: {
        NODE_ENV: "production",
        PORT: "8080",
        // --- Required for admin login (Replit OIDC) on Hostinger ---
        // OIDC_CLIENT_ID: "your-replit-app-id"   # found in your Replit workspace URL
        // ISSUER_URL defaults to https://replit.com/oidc — only override if using a different OIDC provider
        // ADMIN_EMAILS: "you@example.com"         # comma-separated admin allowlist
        // DATABASE_URL: "postgresql://..."
        // SITE_URL: "https://www.fintechpresshub.com"
        // LOCAL_UPLOADS_DIR: "/var/data/uploads"  # must be a persistent volume on Hostinger
      },
    },
  ],
};
