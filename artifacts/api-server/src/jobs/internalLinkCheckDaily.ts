import { logger } from "../lib/logger";
import { runInternalLinkCheck } from "../lib/internalLinkCheck";

const LOG = logger.child({ job: "internal-link-check-daily" });

// Wait 7 minutes after server boot so the sitemap routes are warm and we
// don't collide with the sitemap-health job (which starts at 5 min).
const INITIAL_DELAY_MS = 7 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isEnabled(): boolean {
  if (process.env["NODE_ENV"] === "production") return true;
  return Boolean(process.env["SITE_URL"]?.trim());
}

export function scheduleInternalLinkCheckDaily(): void {
  if (!isEnabled()) {
    LOG.info("Internal-link-check daily job disabled in this environment — set SITE_URL to enable");
    return;
  }

  LOG.info(
    { initialDelayMs: INITIAL_DELAY_MS, intervalMs: ONE_DAY_MS },
    "Scheduled daily internal link check (initial run in 7 min, then every 24h)",
    { job: "internal-link-check-daily" },
  );

  setTimeout(async function tick() {
    LOG.info("Running daily internal link check");
    try {
      const report = await runInternalLinkCheck();
      LOG.info(
        { pagesChecked: report.pagesChecked, totalLinks: report.totalLinks, broken: report.brokenCount },
        "Daily internal link check complete",
      );
    } catch (err) {
      LOG.error({ err }, "Daily internal link check failed");
    }
    setTimeout(tick, ONE_DAY_MS);
  }, INITIAL_DELAY_MS);
}
