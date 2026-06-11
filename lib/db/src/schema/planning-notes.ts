import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const planningNotesTable = pgTable("planning_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  section: text("section").notNull().default("study"),
  type: text("type").notNull().default("note"),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlanningNote = typeof planningNotesTable.$inferSelect;
