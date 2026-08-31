import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scholarshipsTable = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  provider: text("provider"),
  country: text("country"),
  amount: real("amount"),
  currency: text("currency").default("USD"),
  fundingType: text("funding_type").notNull().default("partial"),
  deadline: text("deadline"),
  status: text("status").notNull().default("planning"),
  priority: text("priority").notNull().default("medium"),
  linkedApplicationId: integer("linked_application_id"),
  notes: text("notes"),
  // Pre-existing columns in Neon
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  websiteUrl: text("website_url"),
  eligible: boolean("eligible"),
  link: text("link"),
  // New columns
  dateApplied: text("date_applied"),
  portalUrl: text("portal_url"),
  requirementsJson: text("requirements_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScholarshipSchema = createInsertSchema(scholarshipsTable).omit({ id: true, createdAt: true });
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Scholarship = typeof scholarshipsTable.$inferSelect;
