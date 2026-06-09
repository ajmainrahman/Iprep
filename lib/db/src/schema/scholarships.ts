import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scholarshipsTable = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  fundingType: text("funding_type").notNull().default("partial"),
  deadline: text("deadline"),
  status: text("status").notNull().default("planning"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScholarshipSchema = createInsertSchema(scholarshipsTable).omit({ id: true, createdAt: true });
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Scholarship = typeof scholarshipsTable.$inferSelect;
