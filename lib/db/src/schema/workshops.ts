import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workshopsTable = pgTable("workshops", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  duration: integer("duration").notNull().default(60),
  instructor: text("instructor").notNull(),
  tags: text("tags").array().notNull().default([]),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("upcoming"),
  capacity: integer("capacity").notNull().default(50),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  passScore: integer("pass_score").notNull().default(70),
  timeLimitMinutes: integer("time_limit_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const examQuestionsTable = pgTable("exam_questions", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctIndex: integer("correct_index").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkshopSchema = createInsertSchema(workshopsTable).omit({ id: true, createdAt: true, updatedAt: true, enrolledCount: true });
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Workshop = typeof workshopsTable.$inferSelect;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type ExamQuestion = typeof examQuestionsTable.$inferSelect;
