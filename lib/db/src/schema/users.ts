import { pgTable, text, serial, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
