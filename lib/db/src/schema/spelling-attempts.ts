import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spellingAttemptsTable = pgTable("spelling_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  vocabWordId: integer("vocab_word_id").notNull(),
  mode: text("mode").notNull(),
  wasCorrect: text("was_correct").notNull().default("false"),
  typedAnswer: text("typed_answer"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpellingAttemptSchema = createInsertSchema(spellingAttemptsTable).omit({ id: true, attemptedAt: true });
export type InsertSpellingAttempt = z.infer<typeof insertSpellingAttemptSchema>;
export type SpellingAttempt = typeof spellingAttemptsTable.$inferSelect;
