import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const documentTrackingTable = pgTable("document_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  universityName: text("university_name").notNull(),
  country: text("country"),
  document: text("document").notNull(),
  completeIn: text("complete_in"),
  submissionDeadline: text("submission_deadline"),
  dependencies: text("dependencies"),
  complete: boolean("complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentTracking = typeof documentTrackingTable.$inferSelect;
