import { Router, type IRouter } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { SubscribeToNewsletterBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res) => {
  const parsed = SubscribeToNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source ?? null;

  const existing = await db
    .select()
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0]!;
    res.json({
      id: row.id,
      email: row.email,
      source: row.source,
      alreadySubscribed: true,
      createdAt: row.createdAt.toISOString(),
    });
    return;
  }

  const [row] = await db
    .insert(newsletterSubscribersTable)
    .values({ email, source })
    .returning();

  if (!row) {
    res.status(500).json({ error: "Failed to subscribe" });
    return;
  }

  res.json({
    id: row.id,
    email: row.email,
    source: row.source,
    alreadySubscribed: false,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
