import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, studySessionsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/study-sessions", requireAuth, async (req, res): Promise<void> => {
  const sessions = await db.select().from(studySessionsTable)
    .where(eq(studySessionsTable.userId, req.userId!))
    .orderBy(desc(studySessionsTable.createdAt));
  res.json(sessions);
});

const insertSessionBodySchema = z.object({
  date: z.string(),
  module: z.string(),
  minutes: z.number().int(),
  activityType: z.string(),
  wentWell: z.string().nullable().optional(),
  improve: z.string().nullable().optional(),
});

router.post("/study-sessions", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertSessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db.insert(studySessionsTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(session);
});

router.delete("/study-sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(studySessionsTable)
    .where(and(eq(studySessionsTable.id, id), eq(studySessionsTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
