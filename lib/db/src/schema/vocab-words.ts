import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vocabWordsTable = pgTable("vocab_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  pos: text("pos").notNull(),
  definition: text("definition").notNull(),
  example: text("example").notNull(),
  topic: text("topic").notNull(),
  known: text("known").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVocabWordSchema = createInsertSchema(vocabWordsTable).omit({ id: true, createdAt: true });
export type InsertVocabWord = z.infer<typeof insertVocabWordSchema>;
export type VocabWord = typeof vocabWordsTable.$inferSelect;
