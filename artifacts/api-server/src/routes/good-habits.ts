import { Router, type IRouter } from "express";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { db, goodHabitsTable, habitLogsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The tables are created on first use, so no separate "db push" step is needed.
// They match lib/db/src/schema/good-habits.ts exactly.
let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS good_habits (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        name text NOT NULL,
        emoji text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        date text NOT NULL,
        habit_key text NOT NULL,
        status text NOT NULL DEFAULT 'done',
        note text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_user_date_habit_idx
      ON habit_logs (user_id, date, habit_key)
    `);
  })().catch((err: unknown) => {
    tablesReady = null;
    throw err;
  });
  tablesReady = created;
  return created;
}

router.use("/good-habits", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("good-habits table error:", err?.message);
    res.status(500).json({ error: "Good Habits is not available right now." });
  }
});

/* ── your own habits ─────────────────────────────────────────────────────── */
const habitSchema = z.object({
  name: z.string().trim().min(1).max(60),
  emoji: z.string().trim().max(8).nullable().optional(),
});

router.get("/good-habits/habits", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(goodHabitsTable)
    .where(eq(goodHabitsTable.userId, req.userId!))
    .orderBy(asc(goodHabitsTable.id));
  res.json(rows);
});

router.post("/good-habits/habits", async (req, res): Promise<void> => {
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(goodHabitsTable)
    .values({ ...parsed.data, userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/good-habits/habits/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = habitSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(goodHabitsTable)
    .set(parsed.data)
    .where(and(eq(goodHabitsTable.id, id), eq(goodHabitsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/good-habits/habits/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(goodHabitsTable)
    .where(and(eq(goodHabitsTable.id, id), eq(goodHabitsTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  // its day-by-day history goes with it
  await db
    .delete(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, req.userId!), eq(habitLogsTable.habitKey, `h${id}`)));
  res.sendStatus(204);
});

/* ── day-by-day log ──────────────────────────────────────────────────────── */
router.get("/good-habits/logs", async (req, res): Promise<void> => {
  const days = Math.min(1100, Math.max(7, parseInt(String(req.query.days ?? "400"), 10) || 400));
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, req.userId!), gte(habitLogsTable.date, from)))
    .orderBy(asc(habitLogsTable.date), asc(habitLogsTable.id));
  res.json(rows);
});

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitKey: z.string().trim().min(1).max(64),
  status: z.enum(["done", "missed", "none"]),
  note: z.string().max(1000).nullable().optional(),
});

// Sets one day + habit. status "none" clears it.
router.put("/good-habits/logs", async (req, res): Promise<void> => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { date, habitKey, status } = parsed.data;
  const userId = req.userId!;

  if (status === "none") {
    await db
      .delete(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, date), eq(habitLogsTable.habitKey, habitKey)));
    res.json({ ok: true, cleared: true });
    return;
  }

  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
  const [row] = await db
    .insert(habitLogsTable)
    .values({ userId, date, habitKey, status, note })
    .onConflictDoUpdate({
      target: [habitLogsTable.userId, habitLogsTable.date, habitLogsTable.habitKey],
      set: { status, note, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

export default router;
