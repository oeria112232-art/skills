import { pgTable, text, serial, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { workshopsTable } from "./workshops";
import { tracksTable } from "./tracks";

export const certificatesTable = pgTable("certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  workshopId: integer("workshop_id").references(() => workshopsTable.id, { onDelete: "cascade" }),
  workshopTitle: text("workshop_title"),
  trackId: integer("track_id").references(() => tracksTable.id, { onDelete: "cascade" }),
  trackTitle: text("track_title"),
  type: text("type").notNull().default("workshop"), // "track", "workshop", "participation"
  score: integer("score").notNull().default(0),
  certificateNumber: text("certificate_number").notNull().unique(),
  verificationCode: text("verification_code").notNull().unique().default("MHARAT-EVAL-XXXX"),
  level: integer("level").notNull().default(1), // 1 = Participation, 2 = Professional, 3 = Expert, 4 = Master
  cost: integer("cost").notNull().default(0),
  status: text("status").notNull().default("locked"), // "locked", "issued"
  signatureHash: text("signature_hash"), // HMAC cryptographic seal
  isPaid: integer("is_paid").notNull().default(0), // 1 if paid/free, 0 if pending
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("certificates_user_idx").on(table.userId),
  workshopIdIdx: index("certificates_workshop_idx").on(table.workshopId),
  trackIdIdx: index("certificates_track_idx").on(table.trackId),
  statusIdx: index("certificates_status_idx").on(table.status),
  levelCheck: check("certificates_level_check", sql`${table.level} IN (1, 2, 3, 4)`),
  scoreCheck: check("certificates_score_check", sql`${table.score} >= 0`),
  statusCheck: check("certificates_status_check", sql`${table.status} IN ('locked', 'issued')`),
  isPaidCheck: check("certificates_is_paid_check", sql`${table.isPaid} IN (0, 1)`),
}));

export const insertCertificateSchema = createInsertSchema(certificatesTable, {
  level: z.number().int().min(1).max(5)
}).omit({ id: true, issuedAt: true });
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificatesTable.$inferSelect;
