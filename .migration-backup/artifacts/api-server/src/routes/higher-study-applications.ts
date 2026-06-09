import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, higherStudyApplicationsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

router.get("/higher-study/applications", async (_req, res): Promise<void> => {
  const rows = await db.select().from(higherStudyApplicationsTable).orderBy(desc(higherStudyApplicationsTable.createdAt));
  res.json(rows);
});

const bodySchema = z.object({
  universityName: z.string(),
  country: z.string(),
  program: z.string(),
  degreeType: z.string(),
  status: z.string().optional(),
  deadline: z.string().nullable().optional(),
  appliedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reqSop: z.boolean().optional(),
  reqLor1: z.boolean().optional(),
  reqLor2: z.boolean().optional(),
  reqLor3: z.boolean().optional(),
  reqTranscripts: z.boolean().optional(),
  reqCv: z.boolean().optional(),
  reqGre: z.boolean().optional(),
  reqToefl: z.boolean().optional(),
  reqPortfolio: z.boolean().optional(),
  requirementsJson: z.string().nullable().optional(),
});

router.post("/higher-study/applications", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(higherStudyApplicationsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/higher-study/applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(higherStudyApplicationsTable).set(parsed.data).where(eq(higherStudyApplicationsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/higher-study/applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(higherStudyApplicationsTable).where(eq(higherStudyApplicationsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
