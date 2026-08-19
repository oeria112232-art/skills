import { pgTable, text, serial, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const mockInterviewSessionsTable = pgTable("mock_interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  track: text("track").notNull(),
  title: text("title").notNull().default("Mock Interview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("mock_interview_sessions_user_idx").on(table.userId),
}));

export const mockInterviewMessagesTable = pgTable("mock_interview_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => mockInterviewSessionsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  message: text("message").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionIdx: index("mock_interview_messages_session_idx").on(table.sessionId),
  roleCheck: check("mock_interview_messages_role_check", sql`${table.role} IN ('user', 'assistant', 'system')`),
}));

export const insertMockInterviewSessionSchema = createInsertSchema(mockInterviewSessionsTable).omit({ id: true, createdAt: true });
export type InsertMockInterviewSession = z.infer<typeof insertMockInterviewSessionSchema>;
export type MockInterviewSession = typeof mockInterviewSessionsTable.$inferSelect;
