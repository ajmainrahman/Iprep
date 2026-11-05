import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// One row per day you wrote (or wrote in your paper notebook).
export const journalEntriesTable = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    content: text("content").notNull().default(""),
    mood: integer("mood"), // 1 (rough) .. 5 (great)
    word: text("word"), // one word for the day
    inNotebook: boolean("in_notebook").notNull().default(false),
    lateEntry: boolean("late_entry").notNull().default(false), // written on a later day
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("journal_entries_user_date_idx").on(t.userId, t.date)],
);

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
