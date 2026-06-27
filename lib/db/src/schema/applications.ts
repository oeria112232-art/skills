import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
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
  status: text("status").notNull().default("pending"),
  screeningScore: integer("screening_score"),
  screeningPassed: boolean("screening_passed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, createdAt: true, updatedAt: true, screeningScore: true, screeningPassed: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
