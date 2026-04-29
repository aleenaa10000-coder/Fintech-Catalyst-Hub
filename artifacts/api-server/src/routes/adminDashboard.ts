import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, guestPostSubmissionsTable, contactSubmissionsTable, blogPostsTable, newsletterSubscribersTable, contentReportsTable, authorPhotoRequestsTable } from "@workspace/db";
import { desc, count, eq } from "drizzle-orm";
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
      [reportTotal],
      [reportOpen],
      recentReports,
      [pendingHeadshotCount],
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
      db.select({ total: count() }).from(contentReportsTable),
      db
        .select({ total: count() })
        .from(contentReportsTable)
        .where(eq(contentReportsTable.status, "open")),
      db
        .select({
          id: contentReportsTable.id,
          contentType: contentReportsTable.contentType,
          contentId: contentReportsTable.contentId,
          contentTitle: contentReportsTable.contentTitle,
          reason: contentReportsTable.reason,
          reporterEmail: contentReportsTable.reporterEmail,
          createdAt: contentReportsTable.createdAt,
        })
        .from(contentReportsTable)
        .where(eq(contentReportsTable.status, "open"))
        .orderBy(desc(contentReportsTable.createdAt))
        .limit(5),
      db
        .select({ total: count() })
        .from(authorPhotoRequestsTable)
        .where(eq(authorPhotoRequestsTable.status, "pending")),
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
      contentReports: {
        total: reportTotal?.total ?? 0,
        open: reportOpen?.total ?? 0,
        recent: recentReports,
      },
      authorPhotoRequests: {
        pending: pendingHeadshotCount?.total ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
