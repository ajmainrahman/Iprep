import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, checklistTemplatesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/higher-study/templates", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(checklistTemplatesTable)
    .where(eq(checklistTemplatesTable.userId, req.userId!))
    .orderBy(desc(checklistTemplatesTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  name: z.string(),
  degreeType: z.string().nullable().optional(),
  items: z.string(),
});

router.post("/higher-study/templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(checklistTemplatesTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(row);
});

router.put("/higher-study/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(checklistTemplatesTable).set(parsed.data)
    .where(and(eq(checklistTemplatesTable.id, id), eq(checklistTemplatesTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/higher-study/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(checklistTemplatesTable)
    .where(and(eq(checklistTemplatesTable.id, id), eq(checklistTemplatesTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
