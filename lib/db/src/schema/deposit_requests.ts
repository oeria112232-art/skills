import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const depositRequestsTable = pgTable("deposit_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  pointsAmount: integer("points_amount").notNull(),
  cashAmount: text("cash_amount").notNull(), // cash amount e.g. "50 USD" or "200 SAR"
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  transferScreenshot: text("transfer_screenshot").notNull(), // Base64 data or image url
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsTransactionsTable = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => usersTable.id, { onDelete: "set null" }), // null if system deposit
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // "deposit", "transfer", "refund", "consultation_payment", "workshop_enrollment", "track_enrollment", "certificate_purchase"
  notes: text("notes"),
  discountCode: text("discount_code"),
  signature: text("signature"),
  previousSignature: text("previous_signature"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDepositRequestSchema = createInsertSchema(depositRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type DepositRequest = typeof depositRequestsTable.$inferSelect;

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactionsTable).omit({ id: true, createdAt: true });
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type PointsTransaction = typeof pointsTransactionsTable.$inferSelect;
