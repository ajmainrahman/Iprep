import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, practiceLogsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/practice-logs", requireAuth, async (req, res): Promise<void> => {
  const logs = await db.select().from(practiceLogsTable)
    .where(eq(practiceLogsTable.userId, req.userId!))
    .orderBy(desc(practiceLogsTable.createdAt));
  res.json(logs);
});

const insertPracticeLogBodySchema = z.object({
  date: z.string(),
  module: z.string(),
  subType: z.string(),
  score: z.number(),
  totalQuestions: z.number().int(),
  notes: z.string().nullable().optional(),
});

router.post("/practice-logs", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertPracticeLogBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [log] = await db.insert(practiceLogsTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(log);
});

router.delete("/practice-logs/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(practiceLogsTable)
    .where(and(eq(practiceLogsTable.id, id), eq(practiceLogsTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
