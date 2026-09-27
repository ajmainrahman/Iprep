import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, vocabWordsTable, spellingAttemptsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/spelling/session", requireAuth, async (req, res): Promise<void> => {
  try {
    const topic = typeof req.query.topic === "string" ? req.query.topic : undefined;
    const countRaw = typeof req.query.count === "string" ? parseInt(req.query.count, 10) : 10;
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.min(countRaw, 100) : 10;

    const conditions = [eq(vocabWordsTable.userId, req.userId!)];
    if (topic) conditions.push(eq(vocabWordsTable.topic, topic));

    const rows = await db.select().from(vocabWordsTable)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(count);

    res.json(rows);
  } catch (err: any) {
    console.error("GET spelling/session error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

const attemptBodySchema = z.object({
  vocabWordId: z.number().int(),
  mode: z.enum(["dictation", "definition"]),
  wasCorrect: z.boolean(),
  typedAnswer: z.string().optional(),
});

router.post("/spelling/attempts", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = attemptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db.insert(spellingAttemptsTable).values({
      userId: req.userId!,
      vocabWordId: parsed.data.vocabWordId,
      mode: parsed.data.mode,
      wasCorrect: parsed.data.wasCorrect ? "true" : "false",
      typedAnswer: parsed.data.typedAnswer ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error("POST spelling/attempts error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

router.get("/spelling/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const attempts = await db.select().from(spellingAttemptsTable)
      .where(eq(spellingAttemptsTable.userId, req.userId!))
      .orderBy(spellingAttemptsTable.attemptedAt);

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.wasCorrect === "true").length;
    const accuracy = totalAttempts === 0 ? 0 : Math.round((correctAttempts / totalAttempts) * 100);

    const byWord = new Map<number, typeof attempts>();
    for (const a of attempts) {
      const list = byWord.get(a.vocabWordId) ?? [];
      list.push(a);
      byWord.set(a.vocabWordId, list);
    }

    let masteredCount = 0;
    byWord.forEach((list) => {
      const lastThree = list.slice(-3);
      if (lastThree.length === 3 && lastThree.every(a => a.wasCorrect === "true")) {
        masteredCount++;
      }
    });

    res.json({ totalAttempts, correctAttempts, accuracy, wordsPracticed: byWord.size, masteredCount });
  } catch (err: any) {
    console.error("GET spelling/stats error:", err?.message);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
