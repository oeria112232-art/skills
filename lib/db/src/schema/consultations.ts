import { pgTable, text, serial, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const consultationsTable = pgTable("consultations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // tot, networking, cybersecurity, fullstack, computer-basics, mobile, other
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, replied, closed
  assignedTo: integer("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  response: text("response"),
  repliedBy: integer("replied_by").references(() => usersTable.id, { onDelete: "set null" }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("consultations_user_idx").on(table.userId),
  assignedToIdx: index("consultations_assigned_to_idx").on(table.assignedTo),
  repliedByIdx: index("consultations_replied_by_idx").on(table.repliedBy),
  statusIdx: index("consultations_status_idx").on(table.status),
  statusCheck: check("consultations_status_check", sql`${table.status} IN ('pending', 'replied', 'closed')`),
}));

export const insertConsultationSchema = createInsertSchema(consultationsTable).omit({ id: true, createdAt: true });
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultationsTable.$inferSelect;
