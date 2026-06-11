import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, favouriteAffirmationsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/affirmations", requireAuth, async (req, res): Promise<void> => {
  const affirmations = await db.select().from(favouriteAffirmationsTable)
    .where(eq(favouriteAffirmationsTable.userId, req.userId!))
    .orderBy(desc(favouriteAffirmationsTable.createdAt));
  res.json(affirmations);
});

const insertAffirmationBodySchema = z.object({
  affirmation: z.string(),
  savedAt: z.string(),
});

router.post("/affirmations", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertAffirmationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [affirmation] = await db.insert(favouriteAffirmationsTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(affirmation);
});

router.delete("/affirmations/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(favouriteAffirmationsTable)
    .where(and(eq(favouriteAffirmationsTable.id, id), eq(favouriteAffirmationsTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Affirmation not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
