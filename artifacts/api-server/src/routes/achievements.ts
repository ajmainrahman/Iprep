import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, achievementsTable, achievementYearsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The tables are created on first use, so no separate "db push" step is needed.
// They match lib/db/src/schema/achievements.ts exactly.
let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        year integer NOT NULL,
        kind text NOT NULL DEFAULT 'achievement',
        title text NOT NULL,
        description text,
        why text,
        purpose text,
        category text,
        done boolean NOT NULL DEFAULT false,
        done_date text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievement_years (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        year integer NOT NULL,
        title text,
        subtitle text,
        why text,
        purpose text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS achievement_years_user_year_idx
      ON achievement_years (user_id, year)
    `);
  })().catch((err: unknown) => {
    tablesReady = null;
    throw err;
  });
  tablesReady = created;
  return created;
}

router.use("/achievements", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("achievements table error:", err?.message);
    res.status(500).json({ error: "Achievements is not available right now." });
  }
});

/* ── items ───────────────────────────────────────────────────────────────── */
const text1000 = z.string().trim().max(1000).nullable().optional();
const itemSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  kind: z.enum(["achievement", "goal"]),
  title: z.string().trim().min(1).max(160),
  description: text1000,
  why: text1000,
  purpose: text1000,
  category: z.string().trim().max(30).nullable().optional(),
  done: z.boolean().optional(),
  doneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// empty strings are stored as null
const clean = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = { ...o };
  for (const k of ["description", "why", "purpose", "category"]) {
    if (typeof out[k] === "string" && !(out[k] as string).trim()) out[k] = null;
  }
  return out as T;
};

router.get("/achievements/items", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, req.userId!))
    .orderBy(asc(achievementsTable.year), asc(achievementsTable.id));
  res.json(rows);
});

router.post("/achievements/items", async (req, res): Promise<void> => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = clean(parsed.data);
  const [row] = await db
    .insert(achievementsTable)
    .values({ ...data, done: data.done ?? data.kind === "achievement", userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/achievements/items/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(achievementsTable)
    .set(clean(parsed.data))
    .where(and(eq(achievementsTable.id, id), eq(achievementsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/achievements/items/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(achievementsTable)
    .where(and(eq(achievementsTable.id, id), eq(achievementsTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

/* ── year notes ──────────────────────────────────────────────────────────── */
const yearSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  subtitle: z.string().trim().max(120).nullable().optional(),
  why: text1000,
  purpose: text1000,
});

router.get("/achievements/years", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(achievementYearsTable)
    .where(eq(achievementYearsTable.userId, req.userId!))
    .orderBy(asc(achievementYearsTable.year));
  res.json(rows);
});

// Saves the note for one year. If every field is empty the note is removed.
router.put("/achievements/years/:year", async (req, res): Promise<void> => {
  const year = parseInt(String(req.params.year), 10);
  if (isNaN(year) || year < 1990 || year > 2100) { res.status(400).json({ error: "Invalid year" }); return; }
  const parsed = yearSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const v = {
    title: parsed.data.title?.trim() || null,
    subtitle: parsed.data.subtitle?.trim() || null,
    why: parsed.data.why?.trim() || null,
    purpose: parsed.data.purpose?.trim() || null,
  };
  const userId = req.userId!;
  if (!v.title && !v.subtitle && !v.why && !v.purpose) {
    await db
      .delete(achievementYearsTable)
      .where(and(eq(achievementYearsTable.userId, userId), eq(achievementYearsTable.year, year)));
    res.json({ ok: true, cleared: true });
    return;
  }
  const [row] = await db
    .insert(achievementYearsTable)
    .values({ userId, year, ...v })
    .onConflictDoUpdate({
      target: [achievementYearsTable.userId, achievementYearsTable.year],
      set: { ...v, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

export default router;
