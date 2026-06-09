import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ── SCHEMA (inlined to avoid ESM/CJS conflict) ────────────────
const scoresTable = pgTable("scores", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  module: text("module").notNull(),
  score: real("score"),
  band: real("band").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default("Student"),
  examDate: text("exam_date"),
  targetReading: real("target_reading").notNull().default(6.5),
  targetListening: real("target_listening").notNull().default(6.5),
  targetWriting: real("target_writing").notNull().default(6.5),
  targetSpeaking: real("target_speaking").notNull().default(6.0),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(30),
  darkMode: text("dark_mode").notNull().default("false"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  module: text("module").notNull(),
  minutes: integer("minutes").notNull(),
  activityType: text("activity_type").notNull(),
  wentWell: text("went_well"),
  improve: text("improve"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const practiceLogsTable = pgTable("practice_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  module: text("module").notNull(),
  subType: text("sub_type").notNull(),
  score: real("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const vocabWordsTable = pgTable("vocab_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  pos: text("pos").notNull(),
  definition: text("definition").notNull(),
  example: text("example").notNull(),
  topic: text("topic").notNull(),
  known: text("known").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const favouriteAffirmationsTable = pgTable("favourite_affirmations", {
  id: serial("id").primaryKey(),
  affirmation: text("affirmation").notNull(),
  savedAt: text("saved_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const higherStudyApplicationsTable = pgTable("higher_study_applications", {
  id: serial("id").primaryKey(),
  universityName: text("university_name").notNull(),
  country: text("country").notNull(),
  program: text("program").notNull(),
  degreeType: text("degree_type").notNull(),
  status: text("status").notNull().default("researching"),
  deadline: text("deadline"),
  appliedDate: text("applied_date"),
  notes: text("notes"),
  reqSop: boolean("req_sop").default(false),
  reqLor1: boolean("req_lor1").default(false),
  reqLor2: boolean("req_lor2").default(false),
  reqLor3: boolean("req_lor3").default(false),
  reqTranscripts: boolean("req_transcripts").default(false),
  reqCv: boolean("req_cv").default(false),
  reqGre: boolean("req_gre").default(false),
  reqToefl: boolean("req_toefl").default(false),
  reqPortfolio: boolean("req_portfolio").default(false),
  requirementsJson: text("requirements_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const otherTestScoresTable = pgTable("other_test_scores", {
  id: serial("id").primaryKey(),
  testName: text("test_name").notNull(),
  attemptDate: text("attempt_date").notNull(),
  totalScore: real("total_score"),
  sectionsJson: text("sections_json"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const scholarshipsTable = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  fundingType: text("funding_type").notNull().default("partial"),
  deadline: text("deadline"),
  status: text("status").notNull().default("planning"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const checklistTemplatesTable = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  degreeType: text("degree_type"),
  items: text("items").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── DB CONNECTION ─────────────────────────────────────────────
const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

function verifyToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    if (!token || token === "null" || token === "undefined") return null;
    return jwt.verify(token, process.env.JWT_SECRET || "wfw-secret-fallback");
  } catch {
    return null;
  }
}

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql);
}

function parseId(str) {
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

// ── HANDLER ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = getDb();
  const url = req.url?.split("?")[0] ?? "";
  const method = req.method ?? "GET";
  const body = req.body;

  try {
    // ── AUTH ──────────────────────────────────────────────────
    if (url === "/api/auth/register" && method === "POST") {
      const parsed = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid input. Password must be at least 6 characters." });
      const { name, email, password } = parsed.data;
      const db = getDb();
      const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (existing.length > 0) return res.status(409).json({ error: "Email already registered. Please sign in." });
      const passwordHash = await bcrypt.hash(password, 10);
      const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "wfw-secret-fallback", { expiresIn: "7d" });
      return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (url === "/api/auth/login" && method === "POST") {
      const parsed = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid email or password." });
      const { email, password } = parsed.data;
      const db = getDb();
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (!user) return res.status(401).json({ error: "Invalid email or password." });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid email or password." });
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "wfw-secret-fallback", { expiresIn: "7d" });
      return res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (url === "/api/auth/me" && method === "GET") {
      const decoded = verifyToken(req);
      if (!decoded) return res.status(401).json({ error: "Unauthorized" });
      const db = getDb();
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({ id: user.id, name: user.name, email: user.email });
    }

    // ── HEALTH ────────────────────────────────────────────────
    if (url === "/api/health") return res.json({ status: "ok" });

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
      const parsed = z.object({
        name: z.string().optional(), examDate: z.string().nullable().optional(),
        targetReading: z.number().optional(), targetListening: z.number().optional(),
        targetWriting: z.number().optional(), targetSpeaking: z.number().optional(),
        dailyGoalMinutes: z.number().int().optional(), darkMode: z.string().optional(),
      }).safeParse(body);
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
    if (url === "/api/scores" && method === "GET")
      return res.json(await db.select().from(scoresTable).orderBy(desc(scoresTable.createdAt)));
    if (url === "/api/scores" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(),
        score: z.number().nullable().optional(), band: z.number(),
        notes: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(scoresTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/scores\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(scoresTable).where(eq(scoresTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── STUDY SESSIONS ────────────────────────────────────────
    if (url === "/api/study-sessions" && method === "GET")
      return res.json(await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.createdAt)));
    if (url === "/api/study-sessions" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(), minutes: z.number().int(),
        activityType: z.string(), wentWell: z.string().nullable().optional(),
        improve: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(studySessionsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/study-sessions\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(studySessionsTable).where(eq(studySessionsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── PRACTICE LOGS ─────────────────────────────────────────
    if (url === "/api/practice-logs" && method === "GET")
      return res.json(await db.select().from(practiceLogsTable).orderBy(desc(practiceLogsTable.createdAt)));
    if (url === "/api/practice-logs" && method === "POST") {
      const parsed = z.object({
        date: z.string(), module: z.string(), subType: z.string(),
        score: z.number(), totalQuestions: z.number().int(),
        notes: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(practiceLogsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/practice-logs\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(practiceLogsTable).where(eq(practiceLogsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── VOCAB ─────────────────────────────────────────────────
    if (url === "/api/vocab" && method === "GET")
      return res.json(await db.select().from(vocabWordsTable).orderBy(desc(vocabWordsTable.createdAt)));
    if (url === "/api/vocab" && method === "POST") {
      const parsed = z.object({
        word: z.string(), pos: z.string(), definition: z.string(),
        example: z.string(), topic: z.string(), known: z.string().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(vocabWordsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url === "/api/vocab/bulk" && method === "POST") {
      const parsed = z.object({ words: z.array(z.object({
        word: z.string(), pos: z.string(), definition: z.string(),
        example: z.string(), topic: z.string(), known: z.string().optional(),
      }))}).safeParse(body);
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
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(vocabWordsTable).where(eq(vocabWordsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── AFFIRMATIONS ──────────────────────────────────────────
    if (url === "/api/affirmations" && method === "GET")
      return res.json(await db.select().from(favouriteAffirmationsTable).orderBy(desc(favouriteAffirmationsTable.createdAt)));
    if (url === "/api/affirmations" && method === "POST") {
      const parsed = z.object({ affirmation: z.string(), savedAt: z.string() }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(favouriteAffirmationsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/affirmations\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(favouriteAffirmationsTable).where(eq(favouriteAffirmationsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── HIGHER STUDY APPLICATIONS ─────────────────────────────
    if (url === "/api/higher-study/applications" && method === "GET")
      return res.json(await db.select().from(higherStudyApplicationsTable).orderBy(desc(higherStudyApplicationsTable.createdAt)));
    if (url === "/api/higher-study/applications" && method === "POST") {
      const parsed = z.object({
        universityName: z.string(), country: z.string(),
        program: z.string(), degreeType: z.string(),
        status: z.string().optional(), deadline: z.string().nullable().optional(),
        appliedDate: z.string().nullable().optional(), notes: z.string().nullable().optional(),
        reqSop: z.boolean().optional(), reqLor1: z.boolean().optional(),
        reqLor2: z.boolean().optional(), reqLor3: z.boolean().optional(),
        reqTranscripts: z.boolean().optional(), reqCv: z.boolean().optional(),
        reqGre: z.boolean().optional(), reqToefl: z.boolean().optional(),
        reqPortfolio: z.boolean().optional(), requirementsJson: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(higherStudyApplicationsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/applications\/\d+$/) && method === "PUT") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const parsed = z.object({
        universityName: z.string().optional(), country: z.string().optional(),
        program: z.string().optional(), degreeType: z.string().optional(),
        status: z.string().optional(), deadline: z.string().nullable().optional(),
        appliedDate: z.string().nullable().optional(), notes: z.string().nullable().optional(),
        requirementsJson: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.update(higherStudyApplicationsTable).set(parsed.data).where(eq(higherStudyApplicationsTable.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    }
    if (url.match(/^\/api\/higher-study\/applications\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(higherStudyApplicationsTable).where(eq(higherStudyApplicationsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── OTHER TEST SCORES ─────────────────────────────────────
    if (url === "/api/higher-study/test-scores" && method === "GET")
      return res.json(await db.select().from(otherTestScoresTable).orderBy(desc(otherTestScoresTable.createdAt)));
    if (url === "/api/higher-study/test-scores" && method === "POST") {
      const parsed = z.object({
        testName: z.string(), attemptDate: z.string(),
        totalScore: z.number().nullable().optional(),
        sectionsJson: z.string().nullable().optional(), notes: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(otherTestScoresTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/test-scores\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(otherTestScoresTable).where(eq(otherTestScoresTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── SCHOLARSHIPS ──────────────────────────────────────────
    if (url === "/api/higher-study/scholarships" && method === "GET")
      return res.json(await db.select().from(scholarshipsTable).orderBy(desc(scholarshipsTable.createdAt)));
    if (url === "/api/higher-study/scholarships" && method === "POST") {
      const parsed = z.object({
        name: z.string(), provider: z.string(),
        amount: z.number().nullable().optional(), currency: z.string().optional(),
        fundingType: z.string().optional(), deadline: z.string().nullable().optional(),
        status: z.string().optional(), notes: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(scholarshipsTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/scholarships\/\d+$/) && method === "PUT") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const parsed = z.object({
        name: z.string().optional(), provider: z.string().optional(),
        amount: z.number().nullable().optional(), currency: z.string().optional(),
        fundingType: z.string().optional(), deadline: z.string().nullable().optional(),
        status: z.string().optional(), notes: z.string().nullable().optional(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.update(scholarshipsTable).set(parsed.data).where(eq(scholarshipsTable.id, id)).returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    }
    if (url.match(/^\/api\/higher-study\/scholarships\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(scholarshipsTable).where(eq(scholarshipsTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    // ── CHECKLIST TEMPLATES ───────────────────────────────────
    if (url === "/api/higher-study/templates" && method === "GET")
      return res.json(await db.select().from(checklistTemplatesTable).orderBy(desc(checklistTemplatesTable.createdAt)));
    if (url === "/api/higher-study/templates" && method === "POST") {
      const parsed = z.object({
        name: z.string(), degreeType: z.string().nullable().optional(), items: z.string(),
      }).safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const [row] = await db.insert(checklistTemplatesTable).values(parsed.data).returning();
      return res.status(201).json(row);
    }
    if (url.match(/^\/api\/higher-study\/templates\/\d+$/) && method === "DELETE") {
      const id = parseId(url.split("/").pop());
      if (!id) return res.status(400).json({ error: "Invalid id" });
      const [deleted] = await db.delete(checklistTemplatesTable).where(eq(checklistTemplatesTable.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(204).end();
    }

    return res.status(404).json({ error: "Not found" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
