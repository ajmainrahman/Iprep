import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

// Deep Reflection: your own categories, your own questions, and one answer per question per day.
export const reflectionCategoriesTable = pgTable("reflection_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  intro: text("intro"),
  icon: text("icon").notNull().default("sparkles"),
  color: integer("color").notNull().default(0),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reflectionQuestionsTable = pgTable("reflection_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryId: integer("category_id").notNull(),
  text: text("text").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reflectionAnswersTable = pgTable("reflection_answers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  questionId: integer("question_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  body: text("body").notNull().default(""),
  tags: text("tags").notNull().default(""), // comma separated
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ uq: unique("reflection_answers_uq").on(t.userId, t.questionId, t.date) }));

export type ReflectionCategory = typeof reflectionCategoriesTable.$inferSelect;
export type ReflectionQuestion = typeof reflectionQuestionsTable.$inferSelect;
export type ReflectionAnswer = typeof reflectionAnswersTable.$inferSelect;
