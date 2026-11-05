import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// Strengths, weaknesses, regrets, failures and confusions you want to understand and work on.
export const selfNotesTable = pgTable("self_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull(), // "strength" | "weakness" | "regret" | "failure" | "confusion"
  title: text("title").notNull(),
  details: text("details"), // what it is / what happened
  insight: text("insight"), // evidence / what I learned / what I am unsure about
  action: text("action"), // what I will do about it
  status: text("status").notNull().default("open"), // "open" | "working" | "resolved"
  dueDate: text("due_date"), // YYYY-MM-DD, optional
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SelfNote = typeof selfNotesTable.$inferSelect;
