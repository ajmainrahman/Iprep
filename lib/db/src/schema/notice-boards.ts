import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const noticeBoardsTable = pgTable("notice_boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  boardKey: text("board_key").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userBoardKey: uniqueIndex("notice_boards_user_board_key_idx").on(table.userId, table.boardKey),
}));

export type NoticeBoard = typeof noticeBoardsTable.$inferSelect;