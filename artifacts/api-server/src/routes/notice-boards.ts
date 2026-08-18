import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, noticeBoardsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const defaults = [
  { boardKey: "left", title: "Upcoming Notices", content: "" },
  { boardKey: "right", title: "Focus Tasks", content: "" },
] as const;

router.get("/notice-boards", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(noticeBoardsTable)
      .where(eq(noticeBoardsTable.userId, req.userId!))
      .orderBy(asc(noticeBoardsTable.boardKey));

    const result = defaults.map((fallback) =>
      rows.find((row) => row.boardKey === fallback.boardKey) ?? {
        id: 0,
        userId: req.userId!,
        ...fallback,
        updatedAt: new Date(),
      },
    );
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to load notice boards");
    res.status(500).json({ error: "Unable to load notice boards" });
  }
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(80),
  content: z.string().max(4000),
});

router.put("/notice-boards/:boardKey", requireAuth, async (req, res): Promise<void> => {
  const boardKey = req.params.boardKey;
  if (boardKey !== "left" && boardKey !== "right") {
    res.status(400).json({ error: "Invalid notice board" });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const existing = await db.select().from(noticeBoardsTable)
      .where(and(
        eq(noticeBoardsTable.userId, req.userId!),
        eq(noticeBoardsTable.boardKey, boardKey),
      ));

    const [row] = existing.length
      ? await db.update(noticeBoardsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(noticeBoardsTable.id, existing[0].id))
        .returning()
      : await db.insert(noticeBoardsTable)
        .values({ ...parsed.data, userId: req.userId!, boardKey })
        .returning();

    res.json(row);
  } catch (error) {
    req.log.error({ error }, "Failed to save notice board");
    res.status(500).json({ error: "Unable to save notice board" });
  }
});

export default router;