import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Platform settings table - key-value store for admin configuration
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g. "point_price_cents", "min_deposit", "consultation_cost"
  value: text("value").notNull(), // JSON string for complex values
  label: text("label"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Discount codes table
export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // unique discount code e.g. "WELCOME20"
  discountType: text("discount_type").notNull().default("percent"), // "percent" | "fixed_points"
  discountValue: real("discount_value").notNull(), // e.g. 20 for 20% or 20 for 20 fixed points
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = no expiry
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Payment methods table (shown to users when recharging)
export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "USDT TRC-20", "PayPal", "Bank Transfer"
  accountName: text("account_name").notNull(), // Name of the account holder
  accountNumber: text("account_number").notNull(), // Wallet address / account number / IBAN
  icon: text("icon"), // Emoji or icon identifier
  instructions: text("instructions"), // Additional instructions for the user
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettingsTable).omit({ id: true, updatedAt: true });
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettingsTable.$inferSelect;

export const insertDiscountCodeSchema = createInsertSchema(discountCodesTable).omit({ id: true, createdAt: true, usedCount: true });
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodesTable.$inferSelect;

export const insertPaymentMethodSchema = createInsertSchema(paymentMethodsTable).omit({ id: true, createdAt: true });
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
