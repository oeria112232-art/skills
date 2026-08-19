import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyId: integer("company_id"), // Reference to the company user id
  description: text("description").notNull(),
  type: text("type").notNull().default("full-time"),
  level: text("level").notNull().default("mid"),
  location: text("location"),
  isRemote: boolean("is_remote").notNull().default(false),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  status: text("status").notNull().default("open"),
  passScore: integer("pass_score").notNull().default(70),
  applicationCount: integer("application_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  companyIdx: index("jobs_company_idx").on(table.companyId),
  statusIdx: index("jobs_status_idx").on(table.status),
}));

export const screeningQuestionsTable = pgTable("screening_questions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctIndex: integer("correct_index").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  jobIdx: index("screening_questions_job_idx").on(table.jobId),
}));

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true, applicationCount: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
export type ScreeningQuestion = typeof screeningQuestionsTable.$inferSelect;
