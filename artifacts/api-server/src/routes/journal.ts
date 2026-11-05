import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The table is created on first use, so no separate "db push" step is needed.
// It matches lib/db/src/schema/journal.ts exactly.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        date text NOT NULL,
        content text NOT NULL DEFAULT '',
        mood integer,
        word text,
        in_notebook boolean NOT NULL DEFAULT false,
        late_entry boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_user_date_idx
      ON journal_entries (user_id, date)
    `);
  })().catch((err: unknown) => {
    tableReady = null;
    throw err;
  });
  tableReady = created;
  return created;
}

router.use("/journal", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTable();
    next();
  } catch (err: any) {
    console.error("journal table error:", err?.message);
    res.status(500).json({ error: "Journal is not available right now." });
  }
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const entrySchema = z.object({
  content: z.string().max(50000).optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  word: z.string().trim().max(40).nullable().optional(),
  inNotebook: z.boolean().optional(),
  lateEntry: z.boolean().optional(),
});

router.get("/journal/entries", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.userId, req.userId!))
    .orderBy(asc(journalEntriesTable.date));
  res.json(rows);
});

// Saves one day. A day with no text, no mood, no word and no notebook tick is removed.
router.put("/journal/entries/:date", async (req, res): Promise<void> => {
  const date = String(req.params.date);
  if (!DATE.test(date)) { res.status(400).json({ error: "Invalid date" }); return; }
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.userId!;
  const content = parsed.data.content ?? "";
  const mood = parsed.data.mood ?? null;
  const word = parsed.data.word?.trim() || null;
  const inNotebook = parsed.data.inNotebook ?? false;
  if (!content.trim() && mood === null && !word && !inNotebook) {
    await db.delete(journalEntriesTable).where(and(eq(journalEntriesTable.userId, userId), eq(journalEntriesTable.date, date)));
    res.json({ ok: true, cleared: true });
    return;
  }
  const [row] = await db
    .insert(journalEntriesTable)
    .values({ userId, date, content, mood, word, inNotebook, lateEntry: parsed.data.lateEntry ?? false })
    .onConflictDoUpdate({
      target: [journalEntriesTable.userId, journalEntriesTable.date],
      // keep "written late" once it was set
      set: { content, mood, word, inNotebook, lateEntry: sql`${journalEntriesTable.lateEntry} OR ${parsed.data.lateEntry ?? false}`, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

router.delete("/journal/entries/:date", async (req, res): Promise<void> => {
  const date = String(req.params.date);
  if (!DATE.test(date)) { res.status(400).json({ error: "Invalid date" }); return; }
  await db.delete(journalEntriesTable).where(and(eq(journalEntriesTable.userId, req.userId!), eq(journalEntriesTable.date, date)));
  res.sendStatus(204);
});

export default router;
