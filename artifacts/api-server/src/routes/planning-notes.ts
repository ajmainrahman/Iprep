import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, planningNotesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/planning-notes", requireAuth, async (req, res): Promise<void> => {
  const section = req.query.section as string | undefined;
  const query = db.select().from(planningNotesTable)
    .where(
      section
        ? and(eq(planningNotesTable.userId, req.userId!), eq(planningNotesTable.section, section))
        : eq(planningNotesTable.userId, req.userId!)
    )
    .orderBy(desc(planningNotesTable.createdAt));
  res.json(await query);
});

const bodySchema = z.object({
  section: z.enum(["fly", "study"]),
  type: z.enum(["note", "plan", "budget", "link"]),
  title: z.string().min(1),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

router.post("/planning-notes", requireAuth, async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(planningNotesTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(row);
});

router.put("/planning-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(planningNotesTable).set(parsed.data)
    .where(and(eq(planningNotesTable.id, id), eq(planningNotesTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/planning-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(planningNotesTable)
    .where(and(eq(planningNotesTable.id, id), eq(planningNotesTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
