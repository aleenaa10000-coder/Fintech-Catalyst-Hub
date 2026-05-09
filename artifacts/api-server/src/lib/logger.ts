import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logFile = process.env.LOG_FILE;

/**
 * Pino logger with environment-aware transport:
 *
 * - Development:  pino-pretty coloured output to stdout.
 * - Production, LOG_FILE set: dual transport — JSON to the log file AND
 *   to stdout (fd 1). Set LOG_FILE=./logs/app.log in the PM2 ecosystem
 *   file or Hostinger hPanel env vars to enable persistent file logging.
 * - Production, no LOG_FILE: plain JSON to stdout only (PM2 captures via
 *   pm2 logs / pm2-error.log).
 */
export const logger = isProduction && logFile
  ? pino(
      {
        level: process.env.LOG_LEVEL ?? "info",
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']",
        ],
      },
      pino.transport<{ destination: string | number; mkdir?: boolean }>({
        targets: [
          {
            target: "pino/file",
            options: { destination: logFile, mkdir: true },
            level: process.env.LOG_LEVEL ?? "info",
          },
          {
            target: "pino/file",
            options: { destination: 1 },
            level: process.env.LOG_LEVEL ?? "info",
          },
        ],
      }),
    )
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      ...(isProduction
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }),
    });
