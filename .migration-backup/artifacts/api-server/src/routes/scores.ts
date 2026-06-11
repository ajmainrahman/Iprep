import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, scoresTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/scores", requireAuth, async (req, res): Promise<void> => {
  const scores = await db.select().from(scoresTable)
    .where(eq(scoresTable.userId, req.userId!))
    .orderBy(desc(scoresTable.createdAt));
  res.json(scores);
});

const insertScoreBodySchema = z.object({
  date: z.string(),
  module: z.string(),
  score: z.number().nullable().optional(),
  band: z.number(),
  notes: z.string().nullable().optional(),
});

router.post("/scores", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertScoreBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [score] = await db.insert(scoresTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(score);
});

router.put("/scores/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = insertScoreBodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(scoresTable).set(parsed.data)
    .where(and(eq(scoresTable.id, id), eq(scoresTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Score not found" }); return; }
  res.json(row);
});

router.delete("/scores/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(scoresTable)
    .where(and(eq(scoresTable.id, id), eq(scoresTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Score not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
