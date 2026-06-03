import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, scoresTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/scores", async (_req, res): Promise<void> => {
  const scores = await db.select().from(scoresTable).orderBy(desc(scoresTable.createdAt));
  res.json(scores);
});

const insertScoreBodySchema = z.object({
  date: z.string(),
  module: z.string(),
  score: z.number().nullable().optional(),
  band: z.number(),
  notes: z.string().nullable().optional(),
});

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = insertScoreBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [score] = await db.insert(scoresTable).values(parsed.data).returning();
  res.status(201).json(score);
});

router.delete("/scores/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(scoresTable).where(eq(scoresTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Score not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
