/**
 * Build-time constants injected via Vite `define` (see vite.config.ts).
 *
 * These are string-replaced at build time, not runtime variables — referencing
 * them outside a `JSON.stringify`'d define will produce a literal token that
 * crashes the bundle. Treat them like `process.env.NODE_ENV`.
 */
declare const __TERMS_LAST_UPDATED_ISO__: string;
