import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, checklistTemplatesTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/higher-study/templates", async (_req, res): Promise<void> => {
  const rows = await db.select().from(checklistTemplatesTable).orderBy(desc(checklistTemplatesTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  name: z.string(),
  degreeType: z.string().nullable().optional(),
  items: z.string(),
});

router.post("/higher-study/templates", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(checklistTemplatesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.delete("/higher-study/templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(checklistTemplatesTable).where(eq(checklistTemplatesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
