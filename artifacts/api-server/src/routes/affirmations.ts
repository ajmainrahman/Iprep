import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, favouriteAffirmationsTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/affirmations", async (_req, res): Promise<void> => {
  const affirmations = await db.select().from(favouriteAffirmationsTable).orderBy(desc(favouriteAffirmationsTable.createdAt));
  res.json(affirmations);
});

const insertAffirmationBodySchema = z.object({
  affirmation: z.string(),
  savedAt: z.string(),
});

router.post("/affirmations", async (req, res): Promise<void> => {
  const parsed = insertAffirmationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [affirmation] = await db.insert(favouriteAffirmationsTable).values(parsed.data).returning();
  res.status(201).json(affirmation);
});

router.delete("/affirmations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(favouriteAffirmationsTable).where(eq(favouriteAffirmationsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Affirmation not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
