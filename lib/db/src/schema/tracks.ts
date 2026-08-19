import { pgTable, text, serial, timestamp, integer, index, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const tracksTable = pgTable("tracks", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  level: text("level").notNull().default("beginner"),
  iconUrl: text("icon_url"),
  moduleCount: integer("module_count").notNull().default(0),
  estimatedHours: integer("estimated_hours").notNull().default(0),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  price: integer("price").notNull().default(0), // Points cost to enroll (0 = free)
  instructorId: integer("instructor_id").references(() => usersTable.id, { onDelete: "set null" }),
  certType: text("cert_type").notNull().default("track"), // "track" or "participation"
  certLevel: integer("cert_level").notNull().default(3), // 1=Participation, 2=Professional, 3=Expert, 4=Master
  certCost: integer("cert_cost").notNull().default(250), // Points to claim the certificate
  certSignTitle: text("cert_sign_title").notNull().default("رئيس الهيئة / Board Chairman"),
  certSignName: text("cert_sign_name").notNull().default("أحمد الرشيدي / Ahmed Al-Rashidi"),
  certEkey: text("cert_ekey").notNull().default("MHARAT-SECURE-ESIGN-88192-VERIFIED"),
  certTemplateUrl: text("cert_template_url"),
  certTemplateType: text("cert_template_type").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  instructorIdx: index("tracks_instructor_idx").on(table.instructorId),
  priceCheck: check("tracks_price_check", sql`${table.price} >= 0`),
  certCostCheck: check("tracks_cert_cost_check", sql`${table.certCost} >= 0`),
  certLevelCheck: check("tracks_cert_level_check", sql`${table.certLevel} IN (1, 2, 3, 4)`),
}));

export const trackModulesTable = pgTable("track_modules", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull().references(() => tracksTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("lesson"),
  content: text("content"),
  order: integer("order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(15),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  trackIdx: index("track_modules_track_idx").on(table.trackId),
}));

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  trackId: integer("track_id").notNull().references(() => tracksTable.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull().references(() => trackModulesTable.id, { onDelete: "cascade" }),
  completed: integer("completed").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_progress_user_idx").on(table.userId),
  trackIdx: index("user_progress_track_idx").on(table.trackId),
  moduleIdx: index("user_progress_module_idx").on(table.moduleId),
  unq: unique("user_progress_user_track_module_unq").on(table.userId, table.trackId, table.moduleId),
  completedCheck: check("user_progress_completed_check", sql`${table.completed} IN (0, 1)`),
}));

export const insertTrackSchema = createInsertSchema(tracksTable).omit({ id: true, createdAt: true });
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracksTable.$inferSelect;
export type TrackModule = typeof trackModulesTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;
