import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, fintechPublicationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../lib/routeHelpers";

const router: IRouter = Router();

const PublicationBody = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(500),
  dr: z.number().int().min(0).max(100).default(0),
  tier: z.number().int().min(1).max(3).default(2),
  focus: z.string().max(300).default(""),
  region: z.string().max(100).default("Global"),
  guestPosts: z.boolean().default(false),
  notes: z.string().max(500).default(""),
  sortOrder: z.number().int().default(0),
});

const SEED_PUBLICATIONS = [
  { name: "Finextra", url: "https://www.finextra.com", dr: 76, tier: 1, focus: "Banking & payments news", region: "Global", guestPosts: true, notes: "High editorial bar; expert bylines only", sortOrder: 0 },
  { name: "PYMNTS", url: "https://www.pymnts.com", dr: 74, tier: 1, focus: "Payments & commerce", region: "US", guestPosts: false, notes: "Original research and exclusives preferred", sortOrder: 1 },
  { name: "Finovate", url: "https://finovate.com", dr: 71, tier: 1, focus: "Fintech demos & startups", region: "Global", guestPosts: true, notes: "Demo-driven; good for product launches", sortOrder: 2 },
  { name: "The Financial Brand", url: "https://thefinancialbrand.com", dr: 68, tier: 1, focus: "Banking marketing & CX", region: "US", guestPosts: true, notes: "Long-form, data-rich articles preferred", sortOrder: 3 },
  { name: "Fintech Futures", url: "https://www.fintechfutures.com", dr: 65, tier: 1, focus: "Banking tech & core systems", region: "Global", guestPosts: true, notes: "Strong EU/UK audience", sortOrder: 4 },
  { name: "Tearsheet", url: "https://tearsheet.co", dr: 62, tier: 1, focus: "Modern banking business", region: "US", guestPosts: false, notes: "High-quality editorial; pitch via LinkedIn", sortOrder: 5 },
  { name: "The Block", url: "https://www.theblock.co", dr: 72, tier: 1, focus: "Crypto & DeFi", region: "Global", guestPosts: false, notes: "Research-driven; data exclusives only", sortOrder: 6 },
  { name: "Global Finance Magazine", url: "https://gfmag.com", dr: 67, tier: 1, focus: "Corporate & trade finance", region: "Global", guestPosts: true, notes: "Long editorial cycles; strong brand recognition", sortOrder: 7 },
  { name: "The Paypers", url: "https://thepaypers.com", dr: 58, tier: 2, focus: "Payments & open banking", region: "EU/Global", guestPosts: true, notes: "Strong for PSD3, A2A, and open banking content", sortOrder: 8 },
  { name: "Fintech Magazine", url: "https://fintechmagazine.com", dr: 56, tier: 2, focus: "Fintech industry news", region: "Global", guestPosts: true, notes: "BizClik Media; broad fintech coverage", sortOrder: 9 },
  { name: "IBS Intelligence", url: "https://ibsintelligence.com", dr: 53, tier: 2, focus: "Banking software & core", region: "Global", guestPosts: true, notes: "Strong for core banking and SaaS content", sortOrder: 10 },
  { name: "Crowdfund Insider", url: "https://www.crowdfundinsider.com", dr: 60, tier: 2, focus: "Crowdfunding & crypto", region: "US", guestPosts: true, notes: "Accepts expert columns", sortOrder: 11 },
  { name: "Ledger Insights", url: "https://www.ledgerinsights.com", dr: 55, tier: 2, focus: "Enterprise blockchain", region: "Global", guestPosts: true, notes: "B2B blockchain and CBDC focus", sortOrder: 12 },
  { name: "Bankless Times", url: "https://www.banklesstimes.com", dr: 52, tier: 2, focus: "Open finance & crypto", region: "Global", guestPosts: true, notes: "Good for DeFi and neobanking content", sortOrder: 13 },
  { name: "AltFi", url: "https://www.altfi.com", dr: 51, tier: 2, focus: "Alternative finance & lending", region: "UK", guestPosts: false, notes: "UK-focused alternative lending", sortOrder: 14 },
  { name: "Fintechnews Singapore", url: "https://fintechnews.sg", dr: 48, tier: 2, focus: "APAC fintech", region: "APAC", guestPosts: true, notes: "Best for MAS, Singapore, and APAC content", sortOrder: 15 },
  { name: "Fintechnews Switzerland", url: "https://fintechnews.ch", dr: 46, tier: 2, focus: "Swiss & EU fintech", region: "EU", guestPosts: true, notes: "Swiss banking and WealthTech focus", sortOrder: 16 },
  { name: "Payments Cards & Mobile", url: "https://paymentscardsandmobile.com", dr: 44, tier: 2, focus: "Card payments & issuing", region: "EU/UK", guestPosts: true, notes: "Card issuing, acquiring, and tokenisation", sortOrder: 17 },
  { name: "Fintech Connect", url: "https://www.fintechconnect.com", dr: 40, tier: 3, focus: "Events & networking", region: "UK/EU", guestPosts: true, notes: "Good for event-adjacent content", sortOrder: 18 },
  { name: "FF News", url: "https://ffnews.com", dr: 43, tier: 3, focus: "Fintech press releases & news", region: "Global", guestPosts: true, notes: "Low barrier; useful for brand presence", sortOrder: 19 },
];

/** GET /api/publications — public list, sorted by sort_order then dr desc */
router.get("/publications", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(fintechPublicationsTable)
      .orderBy(asc(fintechPublicationsTable.sortOrder), asc(fintechPublicationsTable.id));

    // Auto-seed on first request if table is empty
    if (rows.length === 0) {
      await db.insert(fintechPublicationsTable).values(SEED_PUBLICATIONS);
      const seeded = await db
        .select()
        .from(fintechPublicationsTable)
        .orderBy(asc(fintechPublicationsTable.sortOrder));
      res.json(seeded);
      return;
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/publications — create */
router.post("/admin/publications", requireAdmin, async (req, res, next) => {
  try {
    const body = PublicationBody.parse(req.body);
    const [row] = await db.insert(fintechPublicationsTable).values(body).returning();
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/admin/publications/:id — update */
router.patch("/admin/publications/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = PublicationBody.partial().parse(req.body);
    const [row] = await db.update(fintechPublicationsTable).set(body).where(eq(fintechPublicationsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/admin/publications/:id */
router.delete("/admin/publications/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(fintechPublicationsTable).where(eq(fintechPublicationsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
