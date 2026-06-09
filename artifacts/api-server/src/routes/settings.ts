import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const settingsId = req.userId!.toString();
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, settingsId));
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({ id: settingsId }).returning();
    res.json(created);
    return;
  }
  res.json(settings);
});

const updateSettingsSchema = z.object({
  name: z.string().optional(),
  examDate: z.string().nullable().optional(),
  targetReading: z.number().optional(),
  targetListening: z.number().optional(),
  targetWriting: z.number().optional(),
  targetSpeaking: z.number().optional(),
  dailyGoalMinutes: z.number().int().optional(),
  darkMode: z.string().optional(),
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settingsId = req.userId!.toString();
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, settingsId));
  if (!existing) {
    const [created] = await db.insert(settingsTable).values({ id: settingsId, ...parsed.data }).returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, settingsId))
    .returning();
  res.json(updated);
});

export default router;
