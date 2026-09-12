import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduledSessionsTable = pgTable("scheduled_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  module: text("module").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status").notNull().default("planned"),
  priority: text("priority").notNull().default("medium"),
  notes: text("notes"),
  linkedStudySessionId: integer("linked_study_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduledSessionSchema = createInsertSchema(scheduledSessionsTable).omit({ id: true, createdAt: true, linkedStudySessionId: true, status: true });
export type InsertScheduledSession = z.infer<typeof insertScheduledSessionSchema>;
export type ScheduledSession = typeof scheduledSessionsTable.$inferSelect;
