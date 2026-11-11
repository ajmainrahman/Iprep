import { Router, type IRouter } from "express";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import {
  db, reflectionCategoriesTable, reflectionQuestionsTable, reflectionAnswersTable,
} from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Tables are created on first use. They match lib/db/src/schema/reflection.ts exactly.
let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reflection_categories (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        title text NOT NULL,
        subtitle text,
        intro text,
        icon text NOT NULL DEFAULT 'sparkles',
        color integer NOT NULL DEFAULT 0,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reflection_questions (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        category_id integer NOT NULL,
        text text NOT NULL,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reflection_answers (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        question_id integer NOT NULL,
        date text NOT NULL,
        body text NOT NULL DEFAULT '',
        tags text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT reflection_answers_uq UNIQUE (user_id, question_id, date)
      )
    `);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS reflection_seeded (user_id integer PRIMARY KEY)`);
  })().catch((err: unknown) => {
    tablesReady = null;
    throw err;
  });
  tablesReady = created;
  return created;
}

router.use("/reflection", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("reflection table error:", err?.message);
    res.status(500).json({ error: "Deep Reflection is not available right now." });
  }
});

// The starter categories and questions. They are added once, the first time you open Deep Reflection.
// After that everything is yours: edit, delete or add anything.
const SEED: { title: string; subtitle: string; intro: string; icon: string; color: number; questions: string[] }[] = [
  {
    title: "Self-Identity", subtitle: "আমি আসলে কে?",
    intro: "নিজের পরিচয় ও ব্যক্তিত্ব বোঝার জন্য।",
    icon: "user", color: 0,
    questions: [
      "আমি আসলে কেমন মানুষ?",
      "অন্যরা আমাকে যেভাবে দেখে, আমি কি সত্যিই সেরকম?",
      "আমার ব্যক্তিত্বের সবচেয়ে স্বতন্ত্র বৈশিষ্ট্য কী?",
      "কোন বিষয়গুলো আমাকে অন্যদের থেকে আলাদা করে?",
      "আমি একা থাকলে কেমন থাকি?",
      "কোন বিষয়গুলো আমাকে সবচেয়ে বেশি আনন্দিত করে?",
      "আমার জীবনের সবচেয়ে গুরুত্বপূর্ণ তিনটি পরিচয় কী?",
      "আমি কি নিজের কাছে সৎ?",
    ],
  },
  {
    title: "Values & Beliefs", subtitle: "আমার মূল্যবোধ কী?",
    intro: "তোমার জীবনের সিদ্ধান্তগুলো কোন নীতির ওপর নির্ভর করে, তা বোঝার জন্য।",
    icon: "gem", color: 4,
    questions: [
      "আমার জীবনের সবচেয়ে গুরুত্বপূর্ণ পাঁচটি মূল্যবোধ কী?",
      "আমার কাছে সফলতার প্রকৃত অর্থ কী?",
      "টাকা, সম্মান, স্বাধীনতা, পরিবার ও মানসিক শান্তির মধ্যে কোনগুলো বেশি গুরুত্বপূর্ণ?",
      "কোন বিষয়ে আমি কখনো আপস করতে চাই না?",
      "আমি কি নিজের বিশ্বাস অনুযায়ী জীবন পরিচালনা করছি?",
      "অন্যের স্বীকৃতি পাওয়ার জন্য কি নিজের মূল্যবোধের সঙ্গে আপস করি?",
      "আমি কেমন মানুষ হিসেবে মানুষের মনে জায়গা করে নিতে চাই?",
    ],
  },
  {
    title: "Strengths & Weaknesses", subtitle: "আমার শক্তি ও দুর্বলতা",
    intro: "নিজের সক্ষমতা ও সীমাবদ্ধতা বোঝার জন্য।",
    icon: "star", color: 2,
    questions: [
      "আমার সবচেয়ে বড় পাঁচটি শক্তি কী?",
      "কোন কাজগুলো আমি অন্যদের তুলনায় ভালো করতে পারি?",
      "মানুষ সাধারণত কোন বিষয়ে আমার সাহায্য চায়?",
      "আমার কোন দুর্বলতাগুলো জীবনে বাধা তৈরি করছে?",
      "আমি কি নিজের দুর্বলতা স্বীকার করতে পারি?",
      "কোন দক্ষতাগুলো উন্নত করা প্রয়োজন?",
      "আমি কি নিজের সক্ষমতাকে সঠিকভাবে কাজে লাগাচ্ছি?",
    ],
  },
  {
    title: "Emotions & Psychology", subtitle: "আমার মানসিক জগৎ",
    intro: "নিজের অনুভূতি, ভয়, দুশ্চিন্তা ও আচরণের কারণ বোঝার জন্য।",
    icon: "heart", color: 3,
    questions: [
      "কোন বিষয়গুলো আমাকে সবচেয়ে বেশি দুশ্চিন্তায় ফেলে?",
      "আমি সাধারণত কোন পরিস্থিতিতে রেগে যাই?",
      "ব্যর্থ হলে আমার প্রতিক্রিয়া কেমন হয়?",
      "আমি কি নিজের অনুভূতি প্রকাশ করতে পারি?",
      "আমি কি অতীত নিয়ে বেশি চিন্তা করি, নাকি ভবিষ্যৎ নিয়ে?",
      "কোন বিষয়গুলো আমাকে নিরাপদ ও শান্ত অনুভব করায়?",
      "আমি কি অন্যদের সঙ্গে নিজের তুলনা করি?",
      "আমার ভয়গুলো কি বাস্তব, নাকি আমার ধারণার ওপর ভিত্তি করে তৈরি?",
    ],
  },
  {
    title: "Regret, Failure & Lessons", subtitle: "অতীত থেকে শিক্ষা",
    intro: "অতীতকে বোঝা, কিন্তু অতীতে আটকে না থাকার জন্য।",
    icon: "history", color: 4,
    questions: [
      "জীবনের কোন সিদ্ধান্তগুলো নিয়ে আমার আফসোস হয়?",
      "অতীতে কোন সুযোগগুলো কাজে লাগাতে পারিনি?",
      "আমার সবচেয়ে বড় ব্যর্থতা থেকে কী শিখেছি?",
      "কোন ভুলগুলো আমি বারবার করি?",
      "অতীতের কোন অভিজ্ঞতা আমাকে সবচেয়ে বেশি পরিবর্তন করেছে?",
      "কোন বিষয়গুলো এখনো আমাকে মানসিকভাবে প্রভাবিত করে?",
      "যদি অতীতের নিজেকে কিছু বলতে পারতাম, কী বলতাম?",
      "অতীতের কোন ভুল থেকে ভবিষ্যতে নিজেকে রক্ষা করতে চাই?",
    ],
  },
  {
    title: "Dreams & Ambitions", subtitle: "আমি আসলে কী চাই?",
    intro: "নিজের আকাঙ্ক্ষা ও উচ্চাকাঙ্ক্ষা বোঝার জন্য।",
    icon: "trophy", color: 1,
    questions: [
      "আমি জীবনে আসলে কী অর্জন করতে চাই?",
      "আমার সবচেয়ে বড় পাঁচটি স্বপ্ন কী?",
      "আমি কেন এত উচ্চাকাঙ্ক্ষী?",
      "আমি কি নিজের জন্য স্বপ্ন দেখি, নাকি অন্যকে দেখানোর জন্য?",
      "অর্থনৈতিকভাবে আমি কোথায় পৌঁছাতে চাই?",
      "আমার আদর্শ জীবন কেমন?",
      "আগামী ১০ বছরে নিজেকে কোথায় দেখতে চাই?",
      "সফল হওয়ার পাশাপাশি আমি কেমন মানুষ হতে চাই?",
    ],
  },
  {
    title: "Relationships & Family", subtitle: "সম্পর্কের ক্ষেত্রে আমি কেমন?",
    intro: "নিজের সামাজিক ও পারিবারিক আচরণ বোঝার জন্য।",
    icon: "users", color: 4,
    questions: [
      "আমি কি আমার কাছের মানুষদের যথেষ্ট সময় দিই?",
      "একজন জীবনসঙ্গী হিসেবে আমার দায়িত্বগুলো কী?",
      "আমি কি অন্যদের কথা মনোযোগ দিয়ে শুনি?",
      "সম্পর্কের ক্ষেত্রে আমার সবচেয়ে বড় প্রত্যাশা কী?",
      "আমি কি নিজের অনুভূতি ও প্রয়োজন পরিষ্কারভাবে প্রকাশ করি?",
      "আমার জীবনে কারা ইতিবাচক প্রভাব রাখে?",
      "আমি কি পরিবারের জন্য যথেষ্ট দায়িত্বশীল?",
      "আমার কারণে অন্যরা কখনো কষ্ট পায় কি?",
    ],
  },
  {
    title: "Habits & Lifestyle", subtitle: "আমার দৈনন্দিন জীবন",
    intro: "নিজের দৈনন্দিন আচরণ ও অভ্যাস বিশ্লেষণের জন্য।",
    icon: "zap", color: 2,
    questions: [
      "আমার দৈনন্দিন অভ্যাসগুলো কি আমাকে লক্ষ্যের দিকে নিয়ে যাচ্ছে?",
      "আমি প্রতিদিন কতটা সময় অর্থপূর্ণ কাজে ব্যয় করি?",
      "কোন অভ্যাসগুলো আমার সময় নষ্ট করে?",
      "আমি কি পর্যাপ্ত ঘুম, বিশ্রাম ও শরীরচর্চাকে গুরুত্ব দিই?",
      "আমার ফোন ও সোশ্যাল মিডিয়া ব্যবহারের ওপর কতটা নিয়ন্ত্রণ আছে?",
      "আমি কি নিয়মিত নতুন কিছু শিখি?",
      "আমার জীবনে কোন একটি অভ্যাস পরিবর্তন করলে সবচেয়ে বেশি ইতিবাচক পরিবর্তন আসবে?",
    ],
  },
  {
    title: "Career & Personal Growth", subtitle: "আমার ভবিষ্যৎ",
    intro: "নিজের পেশাগত পরিচয় ও উন্নতির দিক বোঝার জন্য।",
    icon: "briefcase", color: 0,
    questions: [
      "আমি কোন ধরনের কাজ করতে সবচেয়ে বেশি পছন্দ করি?",
      "আমি কি বর্তমান ক্যারিয়ার নিয়ে সন্তুষ্ট?",
      "আমার দীর্ঘমেয়াদি ক্যারিয়ার লক্ষ্য কী?",
      "কোন দক্ষতাগুলো আমাকে ভবিষ্যতে এগিয়ে রাখবে?",
      "আমি কি শুধু চাকরি করছি, নাকি নিজের ক্যারিয়ার তৈরি করছি?",
      "আমি কোন ধরনের পরিবেশে সবচেয়ে ভালো কাজ করতে পারি?",
      "আমি কি নিজের সম্ভাবনাকে পুরোপুরি কাজে লাগাচ্ছি?",
      "আগামী এক বছরে নিজেকে কীভাবে উন্নত করতে চাই?",
    ],
  },
  {
    title: "Purpose & Spirituality", subtitle: "জীবনের প্রকৃত উদ্দেশ্য",
    intro: "সবচেয়ে গভীর আত্মবিশ্লেষণের জায়গা।",
    icon: "flower", color: 3,
    questions: [
      "আমি কেন বেঁচে আছি? আমার জীবনের উদ্দেশ্য কী?",
      "আমার কাছে একজন ভালো মানুষ হওয়ার অর্থ কী?",
      "আল্লাহর সঙ্গে আমার সম্পর্ক কেমন?",
      "আমার কাজ ও সিদ্ধান্তগুলো কি আমার বিশ্বাসের প্রতিফলন?",
      "আমি কি মানুষের উপকারে আসছি?",
      "মৃত্যুর আগে জীবনে কী কী করতে চাই?",
      "আমার অনুপস্থিতিতে মানুষ আমাকে কীভাবে মনে রাখুক?",
      "আমার জীবনের কোন বিষয়টির জন্য আমি সবচেয়ে বেশি কৃতজ্ঞ?",
    ],
  },
];

async function seedOnce(userId: number): Promise<void> {
  const claimed = await db.execute(sql`INSERT INTO reflection_seeded (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING RETURNING user_id`);
  const rows = (claimed as any).rows ?? claimed;
  if (!Array.isArray(rows) || rows.length === 0) return; // already seeded (or being seeded)
  for (let i = 0; i < SEED.length; i++) {
    const c = SEED[i];
    const [cat] = await db.insert(reflectionCategoriesTable)
      .values({ userId, title: c.title, subtitle: c.subtitle, intro: c.intro, icon: c.icon, color: c.color, position: i })
      .returning();
    await db.insert(reflectionQuestionsTable)
      .values(c.questions.map((text, j) => ({ userId, categoryId: cat.id, text, position: j })));
  }
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Everything for the page in one call.
router.get("/reflection/data", async (req, res): Promise<void> => {
  const userId = req.userId!;
  await seedOnce(userId);
  const [categories, questions, answers] = await Promise.all([
    db.select().from(reflectionCategoriesTable).where(eq(reflectionCategoriesTable.userId, userId)).orderBy(asc(reflectionCategoriesTable.position), asc(reflectionCategoriesTable.id)),
    db.select().from(reflectionQuestionsTable).where(eq(reflectionQuestionsTable.userId, userId)).orderBy(asc(reflectionQuestionsTable.position), asc(reflectionQuestionsTable.id)),
    db.select().from(reflectionAnswersTable).where(eq(reflectionAnswersTable.userId, userId)).orderBy(asc(reflectionAnswersTable.date), asc(reflectionAnswersTable.id)),
  ]);
  res.json({ categories, questions, answers });
});

/* ── categories ── */
const categorySchema = z.object({
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(120).nullable().optional(),
  intro: z.string().trim().max(300).nullable().optional(),
  icon: z.string().trim().min(1).max(30).optional(),
  color: z.number().int().min(0).max(5).optional(),
});

router.post("/reflection/categories", async (req, res): Promise<void> => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${reflectionCategoriesTable.position}), -1) + 1` }).from(reflectionCategoriesTable).where(eq(reflectionCategoriesTable.userId, req.userId!));
  const [row] = await db.insert(reflectionCategoriesTable).values({ ...parsed.data, userId: req.userId!, position: Number(n) }).returning();
  res.status(201).json(row);
});

router.put("/reflection/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(reflectionCategoriesTable).set(parsed.data)
    .where(and(eq(reflectionCategoriesTable.id, id), eq(reflectionCategoriesTable.userId, req.userId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/reflection/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = req.userId!;
  const [cat] = await db.select().from(reflectionCategoriesTable).where(and(eq(reflectionCategoriesTable.id, id), eq(reflectionCategoriesTable.userId, userId)));
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  const qs = await db.select({ id: reflectionQuestionsTable.id }).from(reflectionQuestionsTable)
    .where(and(eq(reflectionQuestionsTable.categoryId, id), eq(reflectionQuestionsTable.userId, userId)));
  const qIds = qs.map(q => q.id);
  if (qIds.length) {
    await db.delete(reflectionAnswersTable).where(and(eq(reflectionAnswersTable.userId, userId), inArray(reflectionAnswersTable.questionId, qIds)));
    await db.delete(reflectionQuestionsTable).where(and(eq(reflectionQuestionsTable.userId, userId), inArray(reflectionQuestionsTable.id, qIds)));
  }
  await db.delete(reflectionCategoriesTable).where(and(eq(reflectionCategoriesTable.id, id), eq(reflectionCategoriesTable.userId, userId)));
  res.sendStatus(204);
});

/* ── questions ── */
const questionSchema = z.object({
  categoryId: z.number().int(),
  text: z.string().trim().min(1).max(500),
});

async function ownsCategory(userId: number, categoryId: number): Promise<boolean> {
  const [c] = await db.select({ id: reflectionCategoriesTable.id }).from(reflectionCategoriesTable)
    .where(and(eq(reflectionCategoriesTable.id, categoryId), eq(reflectionCategoriesTable.userId, userId)));
  return !!c;
}

router.post("/reflection/questions", async (req, res): Promise<void> => {
  const parsed = questionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!(await ownsCategory(req.userId!, parsed.data.categoryId))) { res.status(404).json({ error: "Category not found" }); return; }
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${reflectionQuestionsTable.position}), -1) + 1` }).from(reflectionQuestionsTable)
    .where(and(eq(reflectionQuestionsTable.userId, req.userId!), eq(reflectionQuestionsTable.categoryId, parsed.data.categoryId)));
  const [row] = await db.insert(reflectionQuestionsTable).values({ ...parsed.data, userId: req.userId!, position: Number(n) }).returning();
  res.status(201).json(row);
});

// Add many questions at once (one per line in the app).
router.post("/reflection/questions/bulk", async (req, res): Promise<void> => {
  const parsed = z.object({ categoryId: z.number().int(), texts: z.array(z.string().trim().min(1).max(500)).min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!(await ownsCategory(req.userId!, parsed.data.categoryId))) { res.status(404).json({ error: "Category not found" }); return; }
  const [{ n }] = await db.select({ n: sql<number>`coalesce(max(${reflectionQuestionsTable.position}), -1) + 1` }).from(reflectionQuestionsTable)
    .where(and(eq(reflectionQuestionsTable.userId, req.userId!), eq(reflectionQuestionsTable.categoryId, parsed.data.categoryId)));
  const rows = await db.insert(reflectionQuestionsTable)
    .values(parsed.data.texts.map((text, i) => ({ userId: req.userId!, categoryId: parsed.data.categoryId, text, position: Number(n) + i })))
    .returning();
  res.status(201).json(rows);
});

router.put("/reflection/questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = questionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.categoryId !== undefined && !(await ownsCategory(req.userId!, parsed.data.categoryId))) { res.status(404).json({ error: "Category not found" }); return; }
  const [row] = await db.update(reflectionQuestionsTable).set(parsed.data)
    .where(and(eq(reflectionQuestionsTable.id, id), eq(reflectionQuestionsTable.userId, req.userId!))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/reflection/questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = req.userId!;
  const [q] = await db.select({ id: reflectionQuestionsTable.id }).from(reflectionQuestionsTable)
    .where(and(eq(reflectionQuestionsTable.id, id), eq(reflectionQuestionsTable.userId, userId)));
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(reflectionAnswersTable).where(and(eq(reflectionAnswersTable.questionId, id), eq(reflectionAnswersTable.userId, userId)));
  await db.delete(reflectionQuestionsTable).where(and(eq(reflectionQuestionsTable.id, id), eq(reflectionQuestionsTable.userId, userId)));
  res.sendStatus(204);
});

/* ── answers: one per question per day. Saving an empty answer removes it. ── */
const answerSchema = z.object({
  questionId: z.number().int(),
  date: dateStr,
  body: z.string().max(20000),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
});

router.put("/reflection/answers", async (req, res): Promise<void> => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.userId!;
  const { questionId, date } = parsed.data;
  const body = parsed.data.body.trim();
  const tags = Array.from(new Set((parsed.data.tags ?? []).map(t => t.replace(/,/g, " ").trim()).filter(Boolean))).join(",");
  const [q] = await db.select({ id: reflectionQuestionsTable.id }).from(reflectionQuestionsTable)
    .where(and(eq(reflectionQuestionsTable.id, questionId), eq(reflectionQuestionsTable.userId, userId)));
  if (!q) { res.status(404).json({ error: "Question not found" }); return; }
  if (!body && !tags) {
    await db.delete(reflectionAnswersTable).where(and(eq(reflectionAnswersTable.userId, userId), eq(reflectionAnswersTable.questionId, questionId), eq(reflectionAnswersTable.date, date)));
    res.json({ removed: true, questionId, date });
    return;
  }
  const [row] = await db.insert(reflectionAnswersTable)
    .values({ userId, questionId, date, body, tags })
    .onConflictDoUpdate({
      target: [reflectionAnswersTable.userId, reflectionAnswersTable.questionId, reflectionAnswersTable.date],
      set: { body, tags, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

router.delete("/reflection/answers/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(reflectionAnswersTable)
    .where(and(eq(reflectionAnswersTable.id, id), eq(reflectionAnswersTable.userId, req.userId!))).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
