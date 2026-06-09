import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, scholarshipsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/higher-study/scholarships", async (_req, res): Promise<void> => {
  const rows = await db.select().from(scholarshipsTable).orderBy(desc(scholarshipsTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  name: z.string(),
  provider: z.string(),
  amount: z.number().nullable().optional(),
  currency: z.string().optional(),
  fundingType: z.string().optional(),
  deadline: z.string().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/higher-study/scholarships", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(scholarshipsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/higher-study/scholarships/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(scholarshipsTable).set(parsed.data).where(eq(scholarshipsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/higher-study/scholarships/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(scholarshipsTable).where(eq(scholarshipsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
