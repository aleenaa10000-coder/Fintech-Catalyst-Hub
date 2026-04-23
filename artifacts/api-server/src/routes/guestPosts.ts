import { Router, type IRouter } from "express";
import { db, guestPostSubmissionsTable } from "@workspace/db";
import { SubmitGuestPostBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/guest-posts", async (req, res) => {
  const parsed = SubmitGuestPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const [row] = await db
    .insert(guestPostSubmissionsTable)
    .values({
      name: body.name,
      email: body.email,
      website: body.website ?? null,
      topic: body.topic,
      category: body.category ?? null,
      pitch: body.pitch,
      sampleUrl: body.sampleUrl ?? null,
    })
    .returning();
  if (!row) {
    res.status(500).json({ error: "Failed to save" });
    return;
  }
  res.json({
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    pitch: row.pitch,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
