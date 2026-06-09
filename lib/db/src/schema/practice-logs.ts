import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const practiceLogsTable = pgTable("practice_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  date: text("date").notNull(),
  module: text("module").notNull(),
  subType: text("sub_type").notNull(),
  score: real("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPracticeLogSchema = createInsertSchema(practiceLogsTable).omit({ id: true, createdAt: true });
export type InsertPracticeLog = z.infer<typeof insertPracticeLogSchema>;
export type PracticeLog = typeof practiceLogsTable.$inferSelect;
