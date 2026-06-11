import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, vocabWordsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/vocab", requireAuth, async (req, res): Promise<void> => {
  const words = await db.select().from(vocabWordsTable)
    .where(eq(vocabWordsTable.userId, req.userId!))
    .orderBy(desc(vocabWordsTable.createdAt));
  res.json(words);
});

const insertVocabBodySchema = z.object({
  word: z.string(),
  pos: z.string(),
  definition: z.string(),
  example: z.string(),
  topic: z.string(),
  known: z.string().optional(),
});

router.post("/vocab", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertVocabBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [word] = await db.insert(vocabWordsTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(word);
});

router.post("/vocab/bulk", requireAuth, async (req, res): Promise<void> => {
  const bodySchema = z.object({ words: z.array(insertVocabBodySchema) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wordsWithUser = parsed.data.words.map(w => ({ ...w, userId: req.userId }));
  const inserted = await db.insert(vocabWordsTable).values(wordsWithUser).returning();
  res.status(201).json(inserted);
});

router.patch("/vocab/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db.select().from(vocabWordsTable)
    .where(and(eq(vocabWordsTable.id, id), eq(vocabWordsTable.userId, req.userId!)));
  if (!existing) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  const [updated] = await db
    .update(vocabWordsTable)
    .set({ known: existing.known === "true" ? "false" : "true" })
    .where(and(eq(vocabWordsTable.id, id), eq(vocabWordsTable.userId, req.userId!)))
    .returning();
  res.json(updated);
});

router.delete("/vocab/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(vocabWordsTable)
    .where(and(eq(vocabWordsTable.id, id), eq(vocabWordsTable.userId, req.userId!)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
