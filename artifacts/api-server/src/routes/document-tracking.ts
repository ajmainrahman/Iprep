import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, documentTrackingTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The table is created on first use, so no separate "db push" step is needed.
// The columns match lib/db/src/schema/document-tracking.ts exactly.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  const created: Promise<void> = db
    .execute(sql`
        CREATE TABLE IF NOT EXISTS document_tracking (
          id serial PRIMARY KEY,
          user_id integer,
          university_name text NOT NULL,
          country text,
          document text NOT NULL,
          complete_in text,
          submission_deadline text,
          dependencies text,
          complete boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)
    .then(() => undefined)
    .catch((err: unknown) => {
      tableReady = null;
      throw err;
    });
  tableReady = created;
  return created;
}

router.use("/document-tracking", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTable();
    next();
  } catch (err: any) {
    console.error("document-tracking table error:", err?.message);
    res.status(500).json({ error: "Document tracking is not available right now." });
  }
});

const bodySchema = z.object({
  universityName: z.string().trim().min(1),
  country: z.string().trim().nullable().optional(),
  document: z.string().trim().min(1),
  completeIn: z.string().nullable().optional(),
  submissionDeadline: z.string().nullable().optional(),
  dependencies: z.string().trim().nullable().optional(),
  complete: z.boolean().optional(),
});

router.get("/document-tracking", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(documentTrackingTable)
    .where(eq(documentTrackingTable.userId, req.userId!))
    .orderBy(asc(documentTrackingTable.id));
  res.json(rows);
});

router.post("/document-tracking", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(documentTrackingTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();
  res.status(201).json(row);
});

router.put("/document-tracking/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(documentTrackingTable)
    .set(parsed.data)
    .where(and(eq(documentTrackingTable.id, id), eq(documentTrackingTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/document-tracking/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(documentTrackingTable)
    .where(and(eq(documentTrackingTable.id, id), eq(documentTrackingTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
