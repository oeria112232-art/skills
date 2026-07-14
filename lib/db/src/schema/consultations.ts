import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
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
});

export const insertConsultationSchema = createInsertSchema(consultationsTable).omit({ id: true, createdAt: true });
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultationsTable.$inferSelect;
