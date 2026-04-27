import { Router, type IRouter } from "express";
import {
  db,
  newsletterSubscribersTable,
  authorSubscriptionsTable,
} from "@workspace/db";
import { SubscribeToAuthorBody } from "@workspace/api-zod";
import { and, eq } from "drizzle-orm";
import { getAuthorBySlug } from "../../../fintechpresshub/src/data/authors";

const router: IRouter = Router();

router.post("/authors/:slug/subscribe", async (req, res) => {
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

  // 1. Upsert into the global newsletter list. The unique index on email
  //    means we either find an existing row or insert a new one — first
  //    touch wins for `source`.
  let subscriberId: number;
  const existingSub = await db
    .select({ id: newsletterSubscribersTable.id })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email))
    .limit(1);

  if (existingSub.length > 0) {
    subscriberId = existingSub[0]!.id;
  } else {
    const [inserted] = await db
      .insert(newsletterSubscribersTable)
      .values({ email, source })
      .returning({ id: newsletterSubscribersTable.id });
    if (!inserted) {
      res.status(500).json({ error: "Failed to subscribe" });
      return;
    }
    subscriberId = inserted.id;
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
});

export default router;
