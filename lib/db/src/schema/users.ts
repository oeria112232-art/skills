import { pgTable, text, serial, timestamp, integer, json, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export interface ContactInfo {
  phone?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  address?: string;
}

export interface CVEducation {
  school: string;
  degree: string;
  startYear: string;
  endYear: string;
}

export interface CVExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CVStructure {
  summary?: string;
  avatarUrl?: string;
  skills?: string[];
  education?: CVEducation[];
  experience?: CVExperience[];
}

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"),
  allowedPages: json("allowed_pages").$type<string[]>(), // JSON string array of page IDs
  points: integer("points").notNull().default(0),
  pointsSignature: text("points_signature"),
  streak: integer("streak").notNull().default(0),
  avatarUrl: text("avatar_url"),
  cv: json("cv").$type<CVStructure>(), // Will store structured CV data
  contactInfo: json("contact_info").$type<ContactInfo>(), // Will store contact info
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  companyCategory: text("company_category").default("general"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  roleIdx: index("users_role_idx").on(table.role),
  deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
  roleCheck: check("users_role_check", sql`${table.role} IN ('admin', 'instructor', 'student', 'company')`),
  pointsCheck: check("users_points_check", sql`${table.points} >= 0`),
  streakCheck: check("users_streak_check", sql`${table.streak} >= 0`),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
