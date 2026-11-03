import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Habits you add yourself (Reading books, Helping others, ...). The five daily
// prayers are built in and do not need rows here.
export const goodHabitsTable = pgTable("good_habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per day + habit: "done" or "missed", with an optional comment / reason.
// habitKey is "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" for prayers, or "h<id>" for your own habits.
export const habitLogsTable = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(),
    habitKey: text("habit_key").notNull(),
    status: text("status").notNull().default("done"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("habit_logs_user_date_habit_idx").on(t.userId, t.date, t.habitKey)],
);

export type GoodHabit = typeof goodHabitsTable.$inferSelect;
export type HabitLog = typeof habitLogsTable.$inferSelect;
