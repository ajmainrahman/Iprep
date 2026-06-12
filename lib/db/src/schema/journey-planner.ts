import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const journeyPlannerTable = pgTable("journey_planner", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type JourneyPlanner = typeof journeyPlannerTable.$inferSelect;
