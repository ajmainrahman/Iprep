import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, scholarshipsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/higher-study/scholarships", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(scholarshipsTable)
      .where(eq(scholarshipsTable.userId, req.userId!))
      .orderBy(desc(scholarshipsTable.createdAt));
    res.json(rows ?? []);
  } catch (err: any) {
    console.error("GET scholarships error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

const bodySchema = z.object({
  name: z.string(),
  provider: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().optional(),
  fundingType: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  linkedApplicationId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  dateApplied: z.string().nullable().optional(),
  portalUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  requirementsJson: z.string().nullable().optional(),
  degreeLevel: z.string().nullable().optional(),
  profileMatch: z.number().nullable().optional(),
  relatedUniversities: z.string().nullable().optional(),
});

router.post("/higher-study/scholarships", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(scholarshipsTable).values({ ...parsed.data, userId: req.userId }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error("POST scholarships error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

router.put("/higher-study/scholarships/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = bodySchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.update(scholarshipsTable).set(parsed.data)
      .where(and(eq(scholarshipsTable.id, id), eq(scholarshipsTable.userId, req.userId!)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err: any) {
    console.error("PUT scholarships error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

router.delete("/higher-study/scholarships/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(scholarshipsTable)
      .where(and(eq(scholarshipsTable.id, id), eq(scholarshipsTable.userId, req.userId!)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.sendStatus(204);
  } catch (err: any) {
    console.error("DELETE scholarships error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
