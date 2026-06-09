import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otherTestScoresTable = pgTable("other_test_scores", {
  id: serial("id").primaryKey(),
  testName: text("test_name").notNull(),
  attemptDate: text("attempt_date").notNull(),
  totalScore: real("total_score"),
  sectionsJson: text("sections_json"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtherTestScoreSchema = createInsertSchema(otherTestScoresTable).omit({ id: true, createdAt: true });
export type InsertOtherTestScore = z.infer<typeof insertOtherTestScoreSchema>;
export type OtherTestScore = typeof otherTestScoresTable.$inferSelect;
