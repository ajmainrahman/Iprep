import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, otherTestScoresTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/higher-study/test-scores", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(otherTestScoresTable)
    .where(eq(otherTestScoresTable.userId, req.userId!))
    .orderBy(desc(otherTestScoresTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  testName: z.string(),
  attemptDate: z.string(),
  totalScore: z.number().nullable().optional(),
  sectionsJson: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/higher-study/test-scores", requireAuth, async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(otherTestScoresTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(row);
});

router.put("/higher-study/test-scores/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(otherTestScoresTable).set(parsed.data)
    .where(and(eq(otherTestScoresTable.id, id), eq(otherTestScoresTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/higher-study/test-scores/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(otherTestScoresTable)
    .where(and(eq(otherTestScoresTable.id, id), eq(otherTestScoresTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
