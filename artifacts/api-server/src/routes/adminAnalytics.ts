import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db, blogPostsTable, newsletterSubscribersTable } from "@workspace/db";
import { desc, sql, sum, count } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

router.get("/admin/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [
      topPosts,
      viewsByCategory,
      postsByMonth,
      subscribersByMonth,
      velocityByWeek,
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

      // Content velocity: published vs scheduled posts per week,
      // covering 8 weeks back and 8 weeks forward (16-week window).
      db.execute(
        sql`WITH weeks AS (
          SELECT generate_series(
            DATE_TRUNC('week', NOW() - INTERVAL '7 weeks'),
            DATE_TRUNC('week', NOW() + INTERVAL '8 weeks'),
            INTERVAL '1 week'
          ) AS week_start
        ),
        weekly_published AS (
          SELECT DATE_TRUNC('week', published_at) AS week_start, COUNT(*)::int AS cnt
          FROM blog_posts
          WHERE published_at <= NOW()
            AND published_at >= DATE_TRUNC('week', NOW() - INTERVAL '7 weeks')
          GROUP BY 1
        ),
        weekly_scheduled AS (
          SELECT DATE_TRUNC('week', published_at) AS week_start, COUNT(*)::int AS cnt
          FROM blog_posts
          WHERE published_at > NOW()
            AND published_at < DATE_TRUNC('week', NOW() + INTERVAL '9 weeks')
          GROUP BY 1
        )
        SELECT
          TO_CHAR(weeks.week_start, 'YYYY-MM-DD') AS week_start,
          COALESCE(wp.cnt, 0) AS published,
          COALESCE(ws.cnt, 0) AS scheduled
        FROM weeks
        LEFT JOIN weekly_published wp ON wp.week_start = weeks.week_start
        LEFT JOIN weekly_scheduled  ws ON ws.week_start = weeks.week_start
        ORDER BY weeks.week_start ASC`,
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
      velocityByWeek: velocityByWeek.rows ?? [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
