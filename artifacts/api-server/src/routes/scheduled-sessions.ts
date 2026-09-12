import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, scheduledSessionsTable, studySessionsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/scheduled-sessions", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(scheduledSessionsTable)
      .where(eq(scheduledSessionsTable.userId, req.userId!));
    res.json(rows ?? []);
  } catch (err: any) {
    console.error("GET scheduled-sessions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

const bodySchema = z.object({
  title: z.string(),
  module: z.string(),
  date: z.string(),
  startTime: z.string(),
  durationMinutes: z.number().int(),
  priority: z.string().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/scheduled-sessions", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db.insert(scheduledSessionsTable)
      .values({ ...parsed.data, userId: req.userId!, status: "planned" })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error("POST scheduled-sessions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

const updateSchema = bodySchema.partial().extend({
  status: z.enum(["planned", "completed", "missed", "cancelled"]).optional(),
});

router.put("/scheduled-sessions/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.update(scheduledSessionsTable)
      .set(parsed.data)
      .where(and(eq(scheduledSessionsTable.id, id), eq(scheduledSessionsTable.userId, req.userId!)))
      .returning();
    if (!row) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(row);
  } catch (err: any) {
    console.error("PUT scheduled-sessions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

router.delete("/scheduled-sessions/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(scheduledSessionsTable)
      .where(and(eq(scheduledSessionsTable.id, id), eq(scheduledSessionsTable.userId, req.userId!)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Session not found" }); return; }
    res.sendStatus(204);
  } catch (err: any) {
    console.error("DELETE scheduled-sessions error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

// Marks a planned/missed session as completed AND logs it to Study Log (study_sessions),
// so Learning Activity picks it up automatically. Prevents double-logging via linkedStudySessionId.
router.post("/scheduled-sessions/:id/complete", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [existing] = await db.select().from(scheduledSessionsTable)
      .where(and(eq(scheduledSessionsTable.id, id), eq(scheduledSessionsTable.userId, req.userId!)));
    if (!existing) { res.status(404).json({ error: "Session not found" }); return; }
    if (existing.linkedStudySessionId) {
      res.status(409).json({ error: "Session already logged" });
      return;
    }

    const [studySession] = await db.insert(studySessionsTable).values({
      userId: req.userId!,
      date: existing.date,
      module: existing.module,
      minutes: existing.durationMinutes,
      activityType: existing.title,
    }).returning();

    const [updated] = await db.update(scheduledSessionsTable)
      .set({ status: "completed", linkedStudySessionId: studySession.id })
      .where(eq(scheduledSessionsTable.id, id))
      .returning();

    res.json({ scheduledSession: updated, studySession });
  } catch (err: any) {
    console.error("POST scheduled-sessions/complete error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
