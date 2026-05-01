import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, blogPostsTable, newsletterSubscribersTable } from "@workspace/db";
import { desc, sql, sum, count } from "drizzle-orm";
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

router.get("/admin/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [
      topPosts,
      viewsByCategory,
      postsByMonth,
      subscribersByMonth,
      [totals],
      [subscriberTotal],
    ] = await Promise.all([
      // Top 10 posts by lifetime view count
      db
        .select({
          slug: blogPostsTable.slug,
          title: blogPostsTable.title,
          category: blogPostsTable.category,
          viewCount: blogPostsTable.viewCount,
          publishedAt: blogPostsTable.publishedAt,
        })
        .from(blogPostsTable)
        .orderBy(desc(blogPostsTable.viewCount))
        .limit(10),

      // Total views grouped by category
      db
        .select({
          category: blogPostsTable.category,
          totalViews: sum(blogPostsTable.viewCount).mapWith(Number),
          postCount: count(blogPostsTable.id).mapWith(Number),
        })
        .from(blogPostsTable)
        .groupBy(blogPostsTable.category)
        .orderBy(desc(sum(blogPostsTable.viewCount))),

      // Posts published per calendar month (last 12 months)
      db.execute(
        sql`SELECT
          TO_CHAR(DATE_TRUNC('month', published_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS post_count,
          COALESCE(SUM(view_count), 0)::int AS total_views
        FROM blog_posts
        WHERE published_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC`,
      ),

      // Newsletter subscribers joined per calendar month (last 12 months)
      db.execute(
        sql`SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS new_subscribers
        FROM newsletter_subscribers
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC`,
      ),

      // Global totals: posts, total views, avg views per post
      db
        .select({
          totalPosts: count(blogPostsTable.id).mapWith(Number),
          totalViews: sum(blogPostsTable.viewCount).mapWith(Number),
        })
        .from(blogPostsTable),

      // Total subscriber count
      db.select({ total: count().mapWith(Number) }).from(newsletterSubscribersTable),
    ]);

    const totalPosts = totals?.totalPosts ?? 0;
    const totalViews = totals?.totalViews ?? 0;
    const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    res.json({
      overview: {
        totalPosts,
        totalViews,
        avgViewsPerPost,
        totalSubscribers: subscriberTotal?.total ?? 0,
      },
      topPosts,
      viewsByCategory,
      postsByMonth: postsByMonth.rows ?? [],
      subscribersByMonth: subscribersByMonth.rows ?? [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
