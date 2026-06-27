import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
});

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  trackId: integer("track_id").notNull().references(() => tracksTable.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull().references(() => trackModulesTable.id, { onDelete: "cascade" }),
  completed: integer("completed").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTrackSchema = createInsertSchema(tracksTable).omit({ id: true, createdAt: true });
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracksTable.$inferSelect;
export type TrackModule = typeof trackModulesTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;
