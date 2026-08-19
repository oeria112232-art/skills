import { pgTable, text, serial, timestamp, integer, index, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
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
}, (table) => ({
  userIdIdx: index("deposit_requests_user_idx").on(table.userId),
  statusIdx: index("deposit_requests_status_idx").on(table.status),
  pointsAmountCheck: check("deposit_requests_points_amount_check", sql`${table.pointsAmount} > 0`),
  statusCheck: check("deposit_requests_status_check", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
}));

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
}, (table) => ({
  senderIdx: index("points_transactions_sender_idx").on(table.senderId),
  receiverIdx: index("points_transactions_receiver_idx").on(table.receiverId),
  amountCheck: check("points_transactions_amount_check", sql`${table.amount} > 0`),
}));

export const insertDepositRequestSchema = createInsertSchema(depositRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type DepositRequest = typeof depositRequestsTable.$inferSelect;

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactionsTable).omit({ id: true, createdAt: true });
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type PointsTransaction = typeof pointsTransactionsTable.$inferSelect;
