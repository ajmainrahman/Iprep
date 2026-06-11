import { pgTable, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default("Student"),
  examDate: text("exam_date"),
  targetReading: real("target_reading").notNull().default(6.5),
  targetListening: real("target_listening").notNull().default(6.5),
  targetWriting: real("target_writing").notNull().default(6.5),
  targetSpeaking: real("target_speaking").notNull().default(6.0),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(30),
  darkMode: text("dark_mode").notNull().default("false"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
