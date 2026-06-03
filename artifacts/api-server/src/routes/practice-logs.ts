import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, practiceLogsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/practice-logs", async (_req, res): Promise<void> => {
  const logs = await db.select().from(practiceLogsTable).orderBy(desc(practiceLogsTable.createdAt));
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

router.post("/practice-logs", async (req, res): Promise<void> => {
  const parsed = insertPracticeLogBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [log] = await db.insert(practiceLogsTable).values(parsed.data).returning();
  res.status(201).json(log);
});

router.delete("/practice-logs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(practiceLogsTable).where(eq(practiceLogsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
