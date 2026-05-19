import { Router, type IRouter, type Request, type Response} from "express";
import { z } from "zod";
import { db, webmentionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

import { getSiteUrl } from "../lib/seo";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const WebmentionBody = z.object({
  source: z.string().url(),
  target: z.string().url(),
});

router.post("/webmention", async (req: Request, res: Response) => {
  const parsed = WebmentionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "source and target are required valid URLs" });
    return;
  }
  const { source, target } = parsed.data;
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  if (!target.startsWith(siteUrl)) {
    res.status(400).json({ error: "target must be a URL on this site" });
    return;
  }
  const targetPath = target.replace(siteUrl, "") || "/";
  try {
    await db.insert(webmentionsTable).values({ sourceUrl: source, targetUrl: target, targetPath });
    res.status(202).json({ message: "Webmention received and queued for processing" });
  } catch (err) {
    res.status(500).json({ error: "Failed to store webmention" });
  }
});

router.get("/admin/webmentions", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(webmentionsTable)
      .orderBy(desc(webmentionsTable.receivedAt))
      .limit(200);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch webmentions" });
  }
});

export default router;
