import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, otherTestScoresTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/higher-study/test-scores", async (_req, res): Promise<void> => {
  const rows = await db.select().from(otherTestScoresTable).orderBy(desc(otherTestScoresTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  testName: z.string(),
  attemptDate: z.string(),
  totalScore: z.number().nullable().optional(),
  sectionsJson: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/higher-study/test-scores", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(otherTestScoresTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.delete("/higher-study/test-scores/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(otherTestScoresTable).where(eq(otherTestScoresTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
