import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, guestPostSubmissionsTable, contactSubmissionsTable, blogPostsTable, newsletterSubscribersTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
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

router.get("/admin/dashboard", requireAdmin, async (_req, res, next) => {
  try {
    const [
      [pitchCount],
      recentPitches,
      [contactCount],
      recentContacts,
      [blogCount],
      recentPosts,
      [subscriberCount],
    ] = await Promise.all([
      db.select({ total: count() }).from(guestPostSubmissionsTable),
      db
        .select({
          id: guestPostSubmissionsTable.id,
          name: guestPostSubmissionsTable.name,
          email: guestPostSubmissionsTable.email,
          topic: guestPostSubmissionsTable.topic,
          category: guestPostSubmissionsTable.category,
          createdAt: guestPostSubmissionsTable.createdAt,
        })
        .from(guestPostSubmissionsTable)
        .orderBy(desc(guestPostSubmissionsTable.createdAt))
        .limit(5),
      db.select({ total: count() }).from(contactSubmissionsTable),
      db
        .select({
          id: contactSubmissionsTable.id,
          name: contactSubmissionsTable.name,
          email: contactSubmissionsTable.email,
          company: contactSubmissionsTable.company,
          service: contactSubmissionsTable.service,
          createdAt: contactSubmissionsTable.createdAt,
        })
        .from(contactSubmissionsTable)
        .orderBy(desc(contactSubmissionsTable.createdAt))
        .limit(5),
      db.select({ total: count() }).from(blogPostsTable),
      db
        .select({
          id: blogPostsTable.id,
          slug: blogPostsTable.slug,
          title: blogPostsTable.title,
          category: blogPostsTable.category,
          publishedAt: blogPostsTable.publishedAt,
          viewCount: blogPostsTable.viewCount,
          featured: blogPostsTable.featured,
        })
        .from(blogPostsTable)
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(5),
      db.select({ total: count() }).from(newsletterSubscribersTable),
    ]);

    res.json({
      pitchSubmissions: {
        total: pitchCount?.total ?? 0,
        recent: recentPitches,
      },
      contactSubmissions: {
        total: contactCount?.total ?? 0,
        recent: recentContacts,
      },
      blogPosts: {
        total: blogCount?.total ?? 0,
        recent: recentPosts,
      },
      newsletterSubscribers: {
        total: subscriberCount?.total ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
