import { pgTable, text, serial, timestamp, integer, index, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const workshopsTable = pgTable("workshops", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull().default(60),
  instructor: text("instructor").notNull(),
  tags: text("tags").array().notNull().default([]),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("upcoming"),
  capacity: integer("capacity").notNull().default(50),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  passScore: integer("pass_score").notNull().default(70),
  timeLimitMinutes: integer("time_limit_minutes").default(60),
  certSignTitle: text("cert_sign_title").notNull().default("رئيس الهيئة / Board Chairman"),
  certSignName: text("cert_sign_name").notNull().default("أحمد الرشيدي / Ahmed Al-Rashidi"),
  certEkey: text("cert_ekey").notNull().default("MHARAT-SECURE-ESIGN-88192-VERIFIED"),
  antiCheatEnabled: integer("anti_cheat_enabled").notNull().default(1),
  maxFocusWarnings: integer("max_focus_warnings").notNull().default(3),
  shuffleQuestions: integer("shuffle_questions").notNull().default(1),
  hasExam: integer("has_exam").notNull().default(1),
  hasCertificate: integer("has_certificate").notNull().default(1),
  certTemplateUrl: text("cert_template_url"),
  certTemplateType: text("cert_template_type").notNull().default("default"),
  price: integer("price").notNull().default(0), // Points cost to enroll (0 = free)
  dailyRoomUrl: text("daily_room_url"),
  dailyRoomName: text("daily_room_name"),
  isClosed: integer("is_closed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  statusIdx: index("workshops_status_idx").on(table.status),
  durationCheck: check("workshops_duration_check", sql`${table.duration} > 0`),
  capacityCheck: check("workshops_capacity_check", sql`${table.capacity} > 0`),
  enrolledCountCheck: check("workshops_enrolled_count_check", sql`${table.enrolledCount} >= 0`),
  priceCheck: check("workshops_price_check", sql`${table.price} >= 0`),
  statusCheck: check("workshops_status_check", sql`${table.status} IN ('upcoming', 'ongoing', 'completed')`),
}));

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  attendedMinutes: integer("attended_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workshopIdx: index("enrollments_workshop_idx").on(table.workshopId),
  userIdx: index("enrollments_user_idx").on(table.userId),
  workshopUserIdx: index("enrollments_workshop_user_idx").on(table.workshopId, table.userId),
  unq: unique("enrollments_workshop_user_unq").on(table.workshopId, table.userId),
  attendedMinutesCheck: check("enrollments_attended_minutes_check", sql`${table.attendedMinutes} >= 0`),
}));

export const examQuestionsTable = pgTable("exam_questions", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").array().notNull().default([]),
  correctIndex: integer("correct_index").notNull().default(0),
  type: text("type").notNull().default("mcq"),
  correctAnswerText: text("correct_answer_text").notNull().default(""),
  points: integer("points").notNull().default(10),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopQaTable = pgTable("workshop_qa", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  question: text("question").notNull(),
  votes: integer("votes").notNull().default(0),
  isAnswered: integer("is_answered").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workshopIdx: index("workshop_qa_workshop_idx").on(table.workshopId),
  userIdx: index("workshop_qa_user_idx").on(table.userId),
}));

export const workshopPollsTable = pgTable("workshop_polls", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").array().notNull().default([]),
  isClosed: integer("is_closed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopPollVotesTable = pgTable("workshop_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => workshopPollsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopNotesTable = pgTable("workshop_notes", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  workshopIdx: index("workshop_notes_workshop_idx").on(table.workshopId),
}));

export const workshopSubscriptionsTable = pgTable("workshop_subscriptions", {
  id: serial("id").primaryKey(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workshopIdx: index("workshop_subscriptions_workshop_idx").on(table.workshopId),
  userIdx: index("workshop_subscriptions_user_idx").on(table.userId),
  workshopUserIdx: index("workshop_subscriptions_workshop_user_idx").on(table.workshopId, table.userId),
  unq: unique("workshop_subscriptions_workshop_user_unq").on(table.workshopId, table.userId),
}));

export const insertWorkshopSchema = createInsertSchema(workshopsTable).omit({ id: true, createdAt: true, updatedAt: true, enrolledCount: true });
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Workshop = typeof workshopsTable.$inferSelect;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type ExamQuestion = typeof examQuestionsTable.$inferSelect;
