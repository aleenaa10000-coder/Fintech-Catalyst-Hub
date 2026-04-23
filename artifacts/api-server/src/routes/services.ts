import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { CreateServiceBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (_req, res) => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.id));
  res.json(
    rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      deliverables: r.deliverables ?? [],
      icon: r.icon,
    })),
  );
});

router.post("/services", async (req, res) => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  try {
    const [row] = await db
      .insert(servicesTable)
      .values({
        slug: body.slug,
        name: body.name,
        tagline: body.tagline,
        description: body.description,
        deliverables: body.deliverables,
        icon: body.icon,
      })
      .returning();
    if (!row) {
      res.status(500).json({ error: "Failed to create" });
      return;
    }
    res.json({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      deliverables: row.deliverables ?? [],
      icon: row.icon,
    });
  } catch (err) {
    res.status(409).json({ error: "Slug already exists or insert failed" });
  }
});

router.delete("/services/:slug", async (req, res) => {
  const slug = req.params.slug;
  if (!slug) {
    res.status(400).json({ error: "Missing slug" });
    return;
  }
  await db.delete(servicesTable).where(eq(servicesTable.slug, slug));
  res.status(204).end();
});

export default router;
