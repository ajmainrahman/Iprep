import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../lib/db/src/schema";
import { z } from "zod";

const {
  scoresTable,
  settingsTable,
  studySessionsTable,
  practiceLogsTable,
  vocabWordsTable,
  favouriteAffirmationsTable,
  higherStudyApplicationsTable,
  otherTestScoresTable,
  scholarshipsTable,
  checklistTemplatesTable,
} = schema;

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

async function readBody(req: VercelRequest): Promise<unknown> {
  return req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = getDb();
  const url = req.url?.split("?")[0] ?? "";
  const method = req.method ?? "GET";

  try {
    // ── SETTINGS ──────────────────────────────────────────────
    if (url === "/api/settings" && method === "GET") {
      const [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
      if (!s) {
        const [created] = await db.insert(settingsTable).values({ id: "default" }).returning();
        return res.json(created);
      }
      return res.json(s);
    }
    if (url === "/api/settings" && method === "PUT") {
      const body = await readBody(req);
      const schema = z.object({
        name: z.string().optional(),
        examDate: z.string().nullable().optional(),
        targetReading: z.number().optional(),
        targetListening: z.number().optional(),
        targetWriting: z.number().optional(),
        targetSpeaking: z.number().optional(),
        dailyGoalMinutes: z.number().int().optional(),
        darkMode: z.string().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
      if (!existing) {
        const [created] = await db.insert(settingsTable).values({ id: "default", ...parsed.data }).returning();
        return res.json(created);
      }
      const [updated] = await db.update(settingsTable).set(parsed.data).where(eq(settingsTable.id, "default")).returning();
      return res.json(updated);
    }

    // ── SCORES ────────────────────────────────────────────────
    if (url === "/api/scores" && method === "GET") {
      return res.json(await db.select().from(scoresTable).orderBy(desc(scoresTable.createdAt)));
    }
    if (url === "/api/scores" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(),
        score: z.number().nullable().optional(),
        band: z.number(),
        notes: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(scoresTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/scores\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(scoresTable).where(eq(scoresTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── STUDY SESSIONS ────────────────────────────────────────
    if (url === "/api/study-sessions" && method === "GET") {
      return res.json(await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.createdAt)));
    }
    if (url === "/api/study-sessions" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(),
        minutes: z.number().int(), activityType: z.string(),
        wentWell: z.string().nullable().optional(),
        improve: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(studySessionsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/study-sessions\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(studySessionsTable).where(eq(studySessionsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── PRACTICE LOGS ─────────────────────────────────────────
    if (url === "/api/practice-logs" && method === "GET") {
      return res.json(await db.select().from(practiceLogsTable).orderBy(desc(practiceLogsTable.createdAt)));
    }
    if (url === "/api/practice-logs" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(), subType: z.string(),
        score: z.number(), totalQuestions: z.number().int(),
        notes: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(practiceLogsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/practice-logs\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(practiceLogsTable).where(eq(practiceLogsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── VOCAB ─────────────────────────────────────────────────
    if (url === "/api/vocab" && method === "GET") {
      return res.json(await db.select().from(vocabWordsTable).orderBy(desc(vocabWordsTable.createdAt)));
    }
    if (url === "/api/vocab" && method === "POST") {
      const parsed = z.object({
        word: z.string(), pos: z.string(), definition: z.string(),
        example: z.string(), topic: z.string(),
        known: z.string().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(vocabWordsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url === "/api/vocab/bulk" && method === "POST") {
      const parsed = z.object({ words: z.array(z.object({
        word: z.string(), pos: z.string(), definition: z.string(),
        example: z.string(), topic: z.string(), known: z.string().optional(),
      }))}).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const inserted = await db.insert(vocabWordsTable).values(parsed.data.words).returning();
      return res.status(201).json(inserted);
    }
    if (url.match(/^\/api\/vocab\/\d+\/toggle$/) && method === "PATCH") {
      const id = parseId(url.split("/")[3]);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [existing] = await db.select().from(vocabWordsTable).where(eq(vocabWordsTable.id, id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db.update(vocabWordsTable)
        .set({ known: existing.known === "true" ? "false" : "true" })
        .where(eq(vocabWordsTable.id, id)).returning();
      return res.json(updated);
    }
    if (url.match(/^\/api\/vocab\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(vocabWordsTable).where(eq(vocabWordsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── AFFIRMATIONS ──────────────────────────────────────────
    if (url === "/api/affirmations" && method === "GET") {
      return res.json(await db.select().from(favouriteAffirmationsTable).orderBy(desc(favouriteAffirmationsTable.createdAt)));
    }
    if (url === "/api/affirmations" && method === "POST") {
      const parsed = z.object({
        affirmation: z.string(), savedAt: z.string(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(favouriteAffirmationsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/affirmations\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(favouriteAffirmationsTable).where(eq(favouriteAffirmationsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── HIGHER STUDY APPLICATIONS ─────────────────────────────
    if (url === "/api/higher-study/applications" && method === "GET") {
      return res.json(await db.select().from(higherStudyApplicationsTable).orderBy(desc(higherStudyApplicationsTable.createdAt)));
    }
    if (url === "/api/higher-study/applications" && method === "POST") {
      const parsed = z.object({
        universityName: z.string(), country: z.string(),
        program: z.string(), degreeType: z.string(),
        status: z.string().optional(),
        deadline: z.string().nullable().optional(),
        appliedDate: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        reqSop: z.boolean().optional(), reqLor1: z.boolean().optional(),
        reqLor2: z.boolean().optional(), reqLor3: z.boolean().optional(),
        reqTranscripts: z.boolean().optional(), reqCv: z.boolean().optional(),
        reqGre: z.boolean().optional(), reqToefl: z.boolean().optional(),
        reqPortfolio: z.boolean().optional(),
        requirementsJson: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(higherStudyApplicationsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/applications\/\d+$/) && method === "PUT") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const parsed = z.object({
        universityName: z.string().optional(), country: z.string().optional(),
        program: z.string().optional(), degreeType: z.string().optional(),
        status: z.string().optional(), deadline: z.string().nullable().optional(),
        appliedDate: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        requirementsJson: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.update(higherStudyApplicationsTable).set(parsed.data).where(eq(higherStudyApplicationsTable.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    }
    if (url.match(/^\/api\/higher-study\/applications\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(higherStudyApplicationsTable).where(eq(higherStudyApplicationsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── OTHER TEST SCORES ─────────────────────────────────────
    if (url === "/api/higher-study/test-scores" && method === "GET") {
      return res.json(await db.select().from(otherTestScoresTable).orderBy(desc(otherTestScoresTable.createdAt)));
    }
    if (url === "/api/higher-study/test-scores" && method === "POST") {
      const parsed = z.object({
        testName: z.string(), attemptDate: z.string(),
        totalScore: z.number().nullable().optional(),
        sectionsJson: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(otherTestScoresTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/test-scores\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(otherTestScoresTable).where(eq(otherTestScoresTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── SCHOLARSHIPS ──────────────────────────────────────────
    if (url === "/api/higher-study/scholarships" && method === "GET") {
      return res.json(await db.select().from(scholarshipsTable).orderBy(desc(scholarshipsTable.createdAt)));
    }
    if (url === "/api/higher-study/scholarships" && method === "POST") {
      const parsed = z.object({
        name: z.string(), provider: z.string(),
        amount: z.number().nullable().optional(),
        currency: z.string().optional(),
        fundingType: z.string().optional(),
        deadline: z.string().nullable().optional(),
        status: z.string().optional(),
        notes: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(scholarshipsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/scholarships\/\d+$/) && method === "PUT") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const parsed = z.object({
        name: z.string().optional(), provider: z.string().optional(),
        amount: z.number().nullable().optional(),
        currency: z.string().optional(), fundingType: z.string().optional(),
        deadline: z.string().nullable().optional(),
        status: z.string().optional(), notes: z.string().nullable().optional(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.update(scholarshipsTable).set(parsed.data).where(eq(scholarshipsTable.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    }
    if (url.match(/^\/api\/higher-study\/scholarships\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(scholarshipsTable).where(eq(scholarshipsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── CHECKLIST TEMPLATES ───────────────────────────────────
    if (url === "/api/higher-study/templates" && method === "GET") {
      return res.json(await db.select().from(checklistTemplatesTable).orderBy(desc(checklistTemplatesTable.createdAt)));
    }
    if (url === "/api/higher-study/templates" && method === "POST") {
      const parsed = z.object({
        name: z.string(),
        degreeType: z.string().nullable().optional(),
        items: z.string(),
      }).safeParse(await readBody(req));
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(checklistTemplatesTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/templates\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop()!);
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(checklistTemplatesTable).where(eq(checklistTemplatesTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── HEALTH ────────────────────────────────────────────────
    if (url === "/api/health") {
      return res.json({ status: "ok" });
    }

    return res.status(404).json({ error: "Not found" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
