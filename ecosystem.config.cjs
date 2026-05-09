/**
 * PM2 Ecosystem File — FintechPressHub
 *
 * Hostinger Node.js Business Plan deployment config.
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 *
 * Before first deploy:
 *   1. pnpm run build:production
 *   2. Set all env vars in hPanel or .env
 *   3. pm2 start ecosystem.config.cjs --env production
 */

module.exports = {
  apps: [
    {
      name: "fintechpresshub",
      script: "artifacts/api-server/dist/index.mjs",

      // Cluster mode: spawn one worker per CPU core for true parallelism.
      // PM2 load-balances incoming connections across all workers.
      instances: "max",
      exec_mode: "cluster",

      // Restart policy
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,

      // Log files — written by pino-file transport (LOG_FILE env var).
      // PM2 also captures any stdout/stderr that escapes pino.
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Environment — production
      env_production: {
        NODE_ENV: "production",
        PORT: 8080,
        LOG_FILE: "./logs/app.log",
      },

      // Environment — development (pm2 start ... --env development)
      env_development: {
        NODE_ENV: "development",
        PORT: 8080,
      },
    },
  ],
};
