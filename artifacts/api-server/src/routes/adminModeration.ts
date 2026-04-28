import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, guestPostSubmissionsTable, contactSubmissionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { isAdminEmail } from "../lib/auth";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

router.get("/admin/pitch-submissions", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(guestPostSubmissionsTable)
      .orderBy(desc(guestPostSubmissionsTable.createdAt));
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/contact-submissions", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(contactSubmissionsTable)
      .orderBy(desc(contactSubmissionsTable.createdAt));
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
