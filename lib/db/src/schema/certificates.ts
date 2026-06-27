import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workshopsTable } from "./workshops";

export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  workshopId: integer("workshop_id").notNull().references(() => workshopsTable.id, { onDelete: "cascade" }),
  workshopTitle: text("workshop_title").notNull(),
  score: integer("score").notNull(),
  certificateNumber: text("certificate_number").notNull().unique(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCertificateSchema = createInsertSchema(certificatesTable).omit({ id: true, issuedAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificatesTable.$inferSelect;
