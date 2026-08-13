import { createInsertSchema } from "drizzle-zod";
import {
  date,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  title: text("title").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  scope: text("scope").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  expirationDate: date("expiration_date").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publicUrl: text("public_url").notNull(),
  signerName: text("signer_name"),
  signerTitle: text("signer_title"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signerIp: text("signer_ip"),
  userAgent: text("user_agent"),
  verificationHash: text("verification_hash"),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;