import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const mockInterviewSessionsTable = pgTable("mock_interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  track: text("track").notNull(),
  title: text("title").notNull().default("Mock Interview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mockInterviewMessagesTable = pgTable("mock_interview_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => mockInterviewSessionsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  message: text("message").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMockInterviewSessionSchema = createInsertSchema(mockInterviewSessionsTable).omit({ id: true, createdAt: true });
export type InsertMockInterviewSession = z.infer<typeof insertMockInterviewSessionSchema>;
export type MockInterviewSession = typeof mockInterviewSessionsTable.$inferSelect;
