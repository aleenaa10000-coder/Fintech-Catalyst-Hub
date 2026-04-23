import { Router, type IRouter } from "express";
import { db, contactSubmissionsTable } from "@workspace/db";
import { SubmitContactFormBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/contact", async (req, res) => {
  const parsed = SubmitContactFormBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  const [row] = await db
    .insert(contactSubmissionsTable)
    .values({
      name: body.name,
      email: body.email,
      company: body.company ?? null,
      phone: body.phone ?? null,
      service: body.service ?? null,
      budget: body.budget ?? null,
      message: body.message,
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
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
