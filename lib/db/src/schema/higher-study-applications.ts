import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const higherStudyApplicationsTable = pgTable("higher_study_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  universityName: text("university_name").notNull(),
  country: text("country").notNull(),
  program: text("program").notNull(),
  degreeType: text("degree_type").notNull(),
  status: text("status").notNull().default("researching"),
  deadline: text("deadline"),
  appliedDate: text("applied_date"),
  notes: text("notes"),
  reqSop: boolean("req_sop").default(false),
  reqLor1: boolean("req_lor1").default(false),
  reqLor2: boolean("req_lor2").default(false),
  reqLor3: boolean("req_lor3").default(false),
  reqTranscripts: boolean("req_transcripts").default(false),
  reqCv: boolean("req_cv").default(false),
  reqGre: boolean("req_gre").default(false),
  reqToefl: boolean("req_toefl").default(false),
  reqPortfolio: boolean("req_portfolio").default(false),
  requirementsJson: text("requirements_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHigherStudyApplicationSchema = createInsertSchema(higherStudyApplicationsTable).omit({ id: true, createdAt: true });
export type InsertHigherStudyApplication = z.infer<typeof insertHigherStudyApplicationSchema>;
export type HigherStudyApplication = typeof higherStudyApplicationsTable.$inferSelect;
