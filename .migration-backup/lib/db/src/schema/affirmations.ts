import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const favouriteAffirmationsTable = pgTable("favourite_affirmations", {
  id: serial("id").primaryKey(),
  affirmation: text("affirmation").notNull(),
  savedAt: text("saved_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAffirmationSchema = createInsertSchema(favouriteAffirmationsTable).omit({ id: true, createdAt: true });
export type InsertAffirmation = z.infer<typeof insertAffirmationSchema>;
export type FavouriteAffirmation = typeof favouriteAffirmationsTable.$inferSelect;
