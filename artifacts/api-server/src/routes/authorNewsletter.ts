import { Router, type IRouter } from "express";
import {
  db,
  newsletterSubscribersTable,
  authorSubscriptionsTable,
} from "@workspace/db";
import { SubscribeToAuthorBody } from "@workspace/api-zod";
import { and, eq } from "drizzle-orm";
import { getAuthorBySlug } from "../../../fintechpresshub/src/data/authors";
import { formRateLimiter } from "../lib/rateLimiter";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/authors/:slug/subscribe", formRateLimiter, async (req, res) => {
  try {
    const slug = String(req.params.slug ?? "").toLowerCase();
    const author = getAuthorBySlug(slug);
    if (!author) {
      res.status(404).json({ error: "Unknown author" });
      return;
    }

    const parsed = SubscribeToAuthorBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid input", issues: parsed.error.issues });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const source = `author:${author.slug}`;

    // 1. Upsert into the global newsletter list using insert-first to avoid
    //    the race condition inherent in select→insert. Two concurrent requests
    //    for the same new email would both see an empty select and both try to
    //    insert — the second hits the unique constraint and returns 500.
    //    With onConflictDoNothing(), the second insert is a no-op and we fall
    //    through to a follow-up select to get the existing id.
    let subscriberId: number;
    const [inserted] = await db
      .insert(newsletterSubscribersTable)
      .values({ email, source })
      .onConflictDoNothing()
      .returning({ id: newsletterSubscribersTable.id });

    if (inserted) {
      subscriberId = inserted.id;
    } else {
      // Email already existed — the unique constraint fired. Read the row.
      const [existing] = await db
        .select({ id: newsletterSubscribersTable.id })
        .from(newsletterSubscribersTable)
        .where(eq(newsletterSubscribersTable.email, email))
        .limit(1);
      if (!existing) {
        res.status(500).json({ error: "Failed to subscribe" });
        return;
      }
      subscriberId = existing.id;
    }

    // 2. Link to this author. Idempotent: if the (subscriberId, authorSlug)
    //    pair already exists, return the existing row with alreadySubscribed=true.
    const existingLink = await db
      .select()
      .from(authorSubscriptionsTable)
      .where(
        and(
          eq(authorSubscriptionsTable.subscriberId, subscriberId),
          eq(authorSubscriptionsTable.authorSlug, author.slug),
        ),
      )
      .limit(1);

    if (existingLink.length > 0) {
      const row = existingLink[0]!;
      res.json({
        id: row.id,
        subscriberId: row.subscriberId,
        email,
        authorSlug: row.authorSlug,
        authorName: author.name,
        alreadySubscribed: true,
        createdAt: row.createdAt.toISOString(),
      });
      return;
    }

    const [link] = await db
      .insert(authorSubscriptionsTable)
      .values({ subscriberId, authorSlug: author.slug })
      .returning();

    if (!link) {
      res.status(500).json({ error: "Failed to subscribe" });
      return;
    }

    res.json({
      id: link.id,
      subscriberId: link.subscriberId,
      email,
      authorSlug: link.authorSlug,
      authorName: author.name,
      alreadySubscribed: false,
      createdAt: link.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Author subscription failed");
    res.status(500).json({ error: "Subscription failed" });
  }
});

export default router;
