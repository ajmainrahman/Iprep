import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, vocabWordsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/vocab", async (_req, res): Promise<void> => {
  const words = await db.select().from(vocabWordsTable).orderBy(desc(vocabWordsTable.createdAt));
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

router.post("/vocab", async (req, res): Promise<void> => {
  const parsed = insertVocabBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [word] = await db.insert(vocabWordsTable).values(parsed.data).returning();
  res.status(201).json(word);
});

router.post("/vocab/bulk", async (req, res): Promise<void> => {
  const bodySchema = z.object({ words: z.array(insertVocabBodySchema) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const inserted = await db.insert(vocabWordsTable).values(parsed.data.words).returning();
  res.status(201).json(inserted);
});

router.patch("/vocab/:id/toggle", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db.select().from(vocabWordsTable).where(eq(vocabWordsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  const [updated] = await db
    .update(vocabWordsTable)
    .set({ known: existing.known === "true" ? "false" : "true" })
    .where(eq(vocabWordsTable.id, id))
    .returning();
  res.json(updated);
});

router.delete("/vocab/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(vocabWordsTable).where(eq(vocabWordsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
