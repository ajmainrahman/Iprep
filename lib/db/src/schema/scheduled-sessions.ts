import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduledSessionsTable = pgTable("scheduled_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  module: text("module").notNull(), // Listening | Reading | Writing | Speaking | Vocabulary | Grammar | Mock Test | General
  date: text("date").notNull(), // YYYY-MM-DD, local
  startTime: text("start_time").notNull(), // "HH:MM" 24h
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status").notNull().default("planned"), // planned | completed | missed | cancelled
  priority: text("priority").notNull().default("medium"), // low | medium | high
  notes: text("notes"),
  linkedStudySessionId: integer("linked_study_session_id"), // set when "Mark Completed" logs it to study_sessions
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduledSessionSchema = createInsertSchema(scheduledSessionsTable).omit({ id: true, createdAt: true, linkedStudySessionId: true, status: true });
export type InsertScheduledSession = z.infer<typeof insertScheduledSessionSchema>;
export type ScheduledSession = typeof scheduledSessionsTable.$inferSelect;
