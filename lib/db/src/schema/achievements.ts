import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// One row per achievement or goal ("wishlist") on your timeline.
export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  year: integer("year").notNull(),
  kind: text("kind").notNull().default("achievement"), // "achievement" | "goal"
  title: text("title").notNull(),
  description: text("description"),
  why: text("why"), // why it matters / why you achieved it
  purpose: text("purpose"), // the major purpose behind it
  category: text("category"),
  done: boolean("done").notNull().default(false),
  doneDate: text("done_date"), // YYYY-MM-DD, set when a goal is ticked as achieved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Optional note for a whole year: a title, a subtitle and your reflection.
export const achievementYearsTable = pgTable(
  "achievement_years",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    year: integer("year").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    why: text("why"),
    purpose: text("purpose"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("achievement_years_user_year_idx").on(t.userId, t.year)],
);

export type Achievement = typeof achievementsTable.$inferSelect;
export type AchievementYear = typeof achievementYearsTable.$inferSelect;
