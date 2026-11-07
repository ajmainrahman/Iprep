import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, selfNotesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The table is created on first use. It matches lib/db/src/schema/self-notes.ts exactly.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS self_notes (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        kind text NOT NULL,
        title text NOT NULL,
        details text,
        insight text,
        action text,
        status text NOT NULL DEFAULT 'open',
        due_date text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  })().catch((err: unknown) => {
    tableReady = null;
    throw err;
  });
  tableReady = created;
  return created;
}

router.use("/myself", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTable();
    next();
  } catch (err: any) {
    console.error("self notes table error:", err?.message);
    res.status(500).json({ error: "Know Myself is not available right now." });
  }
});

const long = z.string().trim().max(3000).nullable().optional();
const noteSchema = z.object({
  kind: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  details: long,
  insight: long,
  action: long,
  status: z.enum(["none", "open", "working", "resolved"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const clean = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = { ...o };
  for (const k of ["details", "insight", "action"]) {
    if (typeof out[k] === "string" && !(out[k] as string).trim()) out[k] = null;
  }
  return out as T;
};

router.get("/myself/notes", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(selfNotesTable)
    .where(eq(selfNotesTable.userId, req.userId!))
    .orderBy(asc(selfNotesTable.id));
  res.json(rows);
});

router.post("/myself/notes", async (req, res): Promise<void> => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(selfNotesTable)
    .values({ ...clean(parsed.data), userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/myself/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = noteSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(selfNotesTable)
    .set({ ...clean(parsed.data), updatedAt: new Date() })
    .where(and(eq(selfNotesTable.id, id), eq(selfNotesTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/myself/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(selfNotesTable)
    .where(and(eq(selfNotesTable.id, id), eq(selfNotesTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
