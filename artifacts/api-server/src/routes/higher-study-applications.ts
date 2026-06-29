import { Router, type IRouter } from "express";
import { eq, asc, desc, and, sql } from "drizzle-orm";
import { db, higherStudyApplicationsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/higher-study/applications", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(higherStudyApplicationsTable)
      .where(eq(higherStudyApplicationsTable.userId, req.userId!))
      .orderBy(
        sql`CASE WHEN ${higherStudyApplicationsTable.deadline} IS NULL THEN 1 ELSE 0 END`,
        asc(higherStudyApplicationsTable.deadline),
        desc(higherStudyApplicationsTable.createdAt)
      );
    res.json(rows);
  } catch (err: any) {
    console.error("higher-study/applications error:", err?.message, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error", detail: err?.stack });
  }
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
  websiteUrl: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
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
  priority: z.string().optional(),
});

router.post("/higher-study/applications", requireAuth, async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(higherStudyApplicationsTable).values({ ...parsed.data, userId: req.userId }).returning();
  res.status(201).json(row);
});

router.put("/higher-study/applications/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = bodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(higherStudyApplicationsTable).set(parsed.data)
    .where(and(eq(higherStudyApplicationsTable.id, id), eq(higherStudyApplicationsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/higher-study/applications/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(higherStudyApplicationsTable)
    .where(and(eq(higherStudyApplicationsTable.id, id), eq(higherStudyApplicationsTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
