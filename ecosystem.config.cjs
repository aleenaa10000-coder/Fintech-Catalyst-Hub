/**
 * PM2 ecosystem configuration for Hostinger VPS deployment.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production   # start
 *   pm2 reload ecosystem.config.cjs --env production  # zero-downtime reload
 *   pm2 save                                          # persist across reboots
 *   pm2 startup                                       # generate boot hook
 *
 * Environment-specific overrides go in the env_production block below.
 * Secret values (DATABASE_URL, SESSION_SECRET, etc.) should be set in
 * hPanel → Node.js → Environment Variables — never committed to git.
 */

module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || "fintechpresshub",
      script: "artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",

      // ── Clustering ─────────────────────────────────────────────────────────
      // cluster mode forks 2 worker processes and load-balances requests
      // between them, using both CPU cores on a shared-hosting Business plan.
      // Sessions are stored in PostgreSQL so all workers share state correctly.
      // Increase `instances` if your plan has more cores; set to 1 for debug.
      instances: 2,
      exec_mode: "cluster",

      // ── Reliability ────────────────────────────────────────────────────────
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // ── PM2 ready-signal ───────────────────────────────────────────────────
      // The server emits process.send("ready") inside the app.listen callback.
      // wait_ready: true tells PM2 to wait for that signal before considering
      // a reload successful, so Nginx never routes traffic to a booting worker.
      // listen_timeout: how long PM2 waits for the ready signal (ms).
      // kill_timeout: grace period before SIGKILL on restart/stop (ms).
      wait_ready: true,
      listen_timeout: 30000,
      kill_timeout: 5000,

      // ── Logging ────────────────────────────────────────────────────────────
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
        // PORT is intentionally omitted — Hostinger assigns it automatically via the
        // system environment. Setting it here would override Hostinger's value and
        // make the app unreachable. The app reads process.env.PORT at startup.
        // ADMIN_EMAILS: "you@example.com"         # comma-separated admin allowlist
        // DATABASE_URL: "postgresql://..."        # set via hPanel → Environment Variables
        // SITE_URL: "https://www.fintechpresshub.com"
        // LOCAL_UPLOADS_DIR: "/home/USERNAME/uploads"  # persistent path outside app dir
      },
    },
  ],
};
