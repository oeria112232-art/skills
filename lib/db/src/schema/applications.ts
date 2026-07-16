import { pgTable, text, serial, timestamp, integer, boolean, json, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { jobsTable } from "./jobs";
import { usersTable } from "./users";

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  cvSnapshot: json("cv_snapshot").$type<any>(),
  contactInfoSnapshot: json("contact_info_snapshot").$type<any>(),
  status: text("status").notNull().default("pending"),
  screeningScore: integer("screening_score"),
  screeningPassed: boolean("screening_passed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  jobIdIdx: index("applications_job_id_idx").on(table.jobId),
  userIdIdx: index("applications_user_id_idx").on(table.userId),
  statusIdx: index("applications_status_idx").on(table.status),
  statusCheck: check("applications_status_check", sql`${table.status} IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'rejected')`),
}));

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true, updatedAt: true, screeningScore: true, screeningPassed: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
