import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, journeyPlannerTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/journey-planner", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(journeyPlannerTable).where(eq(journeyPlannerTable.userId, req.userId!));
  res.json(row ?? null);
});

const bodySchema = z.object({
  content: z.string().nullable(),
});

router.put("/journey-planner", requireAuth, async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(journeyPlannerTable).where(eq(journeyPlannerTable.userId, req.userId!));
  if (existing) {
    const [updated] = await db
      .update(journeyPlannerTable)
      .set({ content: parsed.data.content })
      .where(eq(journeyPlannerTable.userId, req.userId!))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(journeyPlannerTable)
      .values({ userId: req.userId!, content: parsed.data.content })
      .returning();
    res.json(created);
  }
});

export default router;
