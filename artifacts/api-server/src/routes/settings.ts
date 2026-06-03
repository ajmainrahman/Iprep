import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/settings", async (req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
  if (!settings) {
    const [created] = await db.insert(settingsTable).values({ id: "default" }).returning();
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

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
  if (!existing) {
    const [created] = await db.insert(settingsTable).values({ id: "default", ...parsed.data }).returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(settingsTable)
    .set(parsed.data)
    .where(eq(settingsTable.id, "default"))
    .returning();
  res.json(updated);
});

export default router;
