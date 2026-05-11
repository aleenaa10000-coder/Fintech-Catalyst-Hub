import { Router } from "express";
import { getSiteUrl } from "../lib/seo";

const router = Router();

/**
 * /.well-known/security.txt — RFC 9116
 *
 * Machine-readable security contact declaration. A minor but recognised
 * E-E-A-T trust signal for YMYL fintech sites and increasingly checked
 * by security scanners used by enterprise clients during vendor assessment.
 * Expires 1 year from the build date; no rebuild required on Replit because
 * the Expires field is computed at request time.
 */
router.get("/.well-known/security.txt", (_req, res) => {
  const siteUrl = getSiteUrl();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");

  const txt = [
    `Contact: mailto:security@fintechpresshub.com`,
    `Expires: ${expires}`,
    `Preferred-Languages: en`,
    `Canonical: ${siteUrl}/.well-known/security.txt`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(txt + "\n");
});

export default router;
