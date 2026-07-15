import { Router } from "express";
import { db, usersTable, depositRequestsTable, pointsTransactionsTable, discountCodesTable, paymentMethodsTable, platformSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { logAuditEvent } from "../services/audit-log";
import { 
  verifyAndHardenUserBalance, 
  updateAndSignUserBalance, 
  insertSecureTransaction, 
  acquireUserLock, 
  acquireDoubleUserLock,
  checkDuplicateTransaction,
  claimNonce,
} from "../services/wallet-security";
import { paymentRateLimit, transferRateLimit } from "../middlewares/rateLimit";
import { z } from "zod";

const DepositRequestSchema = z.object({
  pointsAmount: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).pipe(z.number().int().positive()),
  cashAmount: z.string().min(1),
  transferScreenshot: z.string().min(1),
  notes: z.string().optional().nullable(),
  paymentMethodId: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).optional().nullable(),
});

const TransferVerifySchema = z.object({
  email: z.string().email(),
  amount: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).pipe(z.number().int().positive()),
});

const TransferConfirmSchema = z.object({
  email: z.string().email(),
  amount: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).pipe(z.number().int().positive()),
});

const AdminDiscountCodeSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(["percent", "fixed_points"]),
  discountValue: z.number().positive(),
  maxUses: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const AdminPaymentMethodSchema = z.object({
  name: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  icon: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.union([z.number(), z.string().transform((v: string) => parseInt(v, 10))]).optional().nullable(),
});

const router = Router();

// =============================================
// HELPER FUNCTIONS
// =============================================

function serializeDeposit(d: any, userName: string, userEmail: string) {
  return {
    ...d,
    userName,
    userEmail,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  };
}

function serializeTransaction(t: any, senderName: string, receiverName: string) {
  return {
    ...t,
    senderName,
    receiverName,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
  };
}

function serializeDiscountCode(c: any) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
  };
}

function serializePaymentMethod(p: any) {
  return {
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

// Default platform settings
const DEFAULT_SETTINGS: Record<string, { value: string; label: string }> = {
  point_price_cents: { value: "2", label: "سعر النقطة الواحدة (سنت)" },
  consultation_cost: { value: "100", label: "تكلفة الاستشارة (نقطة)" },
  min_deposit_points: { value: "50", label: "الحد الأدنى للشحن (نقطة)" },
  max_deposit_points: { value: "10000", label: "الحد الأقصى للشحن (نقطة)" },
  welcome_message: { value: "مرحباً! تكلفة كل استشارة 100 نقطة = 2 دولار.", label: "رسالة الترحيب" },
  consultation_enabled: { value: "true", label: "تفعيل الاستشارات المدفوعة" },
  transfer_min_points: { value: "10", label: "الحد الأدنى للتحويل (نقطة)" },
  transfer_fee_percent: { value: "0", label: "رسوم التحويل (%)" },
  r2_account_id: { value: "", label: "Cloudflare R2 Account ID" },
  r2_access_key_id: { value: "", label: "R2 Access Key ID" },
  r2_secret_access_key: { value: "", label: "R2 Secret Access Key" },
  r2_bucket_name: { value: "", label: "R2 Bucket Name" },
  r2_public_domain: { value: "", label: "R2 Public Domain (اختياري — لمحة عامة)" },
};

// =============================================
// USER ROUTES
// =============================================

// 1. GET /points/wallet - Get wallet details
router.get("/points/wallet", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Cryptographic validation of wallet balance integrity
    const isIntegrityOk = await verifyAndHardenUserBalance(user);
    if (!isIntegrityOk) {
      res.status(400).json({ error: "Security warning: Point balance integrity check failed. Please contact support." });
      return;
    }

    const deposits = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.userId, userId));
    const sortedDeposits = deposits.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allTransactions = await db.select().from(pointsTransactionsTable);
    const userTransactions = allTransactions.filter(
      (t: any) => t.senderId === userId || t.receiverId === userId
    );
    const sortedTransactions = userTransactions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allUsers = await db.select().from(usersTable);
    const userMap = new Map(allUsers.map((u: any) => [u.id, u.name]));

    const mappedDeposits = sortedDeposits.map((d: any) => serializeDeposit(d, user.name, user.email));
    const mappedTransactions = sortedTransactions.map((t: any) => {
      const senderName = t.senderId ? (userMap.get(t.senderId) || "System") : "System";
      const receiverName = userMap.get(t.receiverId) || "User";
      return serializeTransaction(t, senderName, receiverName);
    });

    res.json({
      points: user.points || 0,
      deposits: mappedDeposits,
      transactions: mappedTransactions,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /points/payment-methods - Get active payment methods (public for authenticated users)
router.get("/points/payment-methods", requireAuth, async (_req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const methods = await db.select().from(paymentMethodsTable);
    const active = methods
      .filter((m: any) => m.isActive !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    res.json(active.map(serializePaymentMethod));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET /points/platform-info - Get public platform info (point price, consultation cost)
router.get("/points/platform-info", requireAuth, async (_req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const settings = await db.select().from(platformSettingsTable);
    const settingsMap: Record<string, string> = {};
    for (const s of settings as any[]) {
      settingsMap[s.key] = s.value;
    }
    
    // Merge with defaults
    const merged: Record<string, string> = {};
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      merged[key] = settingsMap[key] ?? def.value;
    }
    
    res.json(merged);
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /points/deposit-request - Submit deposit proof
router.post("/points/deposit-request", requireAuth, paymentRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = DepositRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { pointsAmount, cashAmount, transferScreenshot, notes, paymentMethodId } = parsed.data;

    const [newRequest] = await db.insert(depositRequestsTable).values({
      userId: req.user!.id,
      pointsAmount,
      cashAmount,
      transferScreenshot,
      notes: notes ? `${notes}${paymentMethodId ? ` | Method ID: ${paymentMethodId}` : ""}` : (paymentMethodId ? `Method ID: ${paymentMethodId}` : ""),
      status: "pending",
    }).returning();

    await logAuditEvent({ action: "deposit_request", userId: req.user!.id, targetType: "deposit", targetId: newRequest.id, details: { pointsAmount, cashAmount }, req });
    res.status(201).json(serializeDeposit(newRequest, req.user!.name, req.user!.email));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. POST /points/apply-discount - Validate a discount code (no DB write, just validation)
router.post("/points/apply-discount", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { code, baseCost } = req.body;
    if (!code || String(code).trim() === "") {
      res.status(400).json({ error: "Discount code is required" });
      return;
    }

    const allCodes = await db.select().from(discountCodesTable);
    const discountCode = (allCodes as any[]).find(
      (c: any) => c.code.toUpperCase() === String(code).trim().toUpperCase()
    );

    if (!discountCode) {
      res.status(404).json({ error: "الكود غير موجود أو غير صالح" });
      return;
    }
    if (!discountCode.isActive) {
      res.status(400).json({ error: "هذا الكود غير مفعّل" });
      return;
    }
    if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
      res.status(400).json({ error: "تم استخدام هذا الكود بالحد الأقصى المسموح" });
      return;
    }
    if (discountCode.expiresAt && new Date(discountCode.expiresAt) < new Date()) {
      res.status(400).json({ error: "انتهت صلاحية هذا الكود" });
      return;
    }

    const base = parseInt(baseCost || "100", 10);
    let finalCost = base;

    if (discountCode.discountType === "percent") {
      finalCost = Math.ceil(base * (1 - discountCode.discountValue / 100));
    } else if (discountCode.discountType === "fixed_points") {
      finalCost = Math.max(0, base - discountCode.discountValue);
    }

    res.json({
      valid: true,
      code: discountCode.code,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      originalCost: base,
      finalCost,
      savings: base - finalCost,
      description: discountCode.description || "",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. POST /points/transfer/verify - Verify transfer destination
router.post("/points/transfer/verify", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = TransferVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { email, amount } = parsed.data;

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!sender) {
      res.status(404).json({ error: "Sender not found" });
      return;
    }
    if ((sender.points || 0) < amount) {
      res.status(400).json({ error: `Insufficient points. You only have ${sender.points || 0} points.` });
      return;
    }

    const targetEmail = email.trim().toLowerCase();
    if (targetEmail === sender.email.toLowerCase()) {
      res.status(400).json({ error: "Cannot transfer points to your own email" });
      return;
    }

    const allUsers = await db.select().from(usersTable);
    const recipient = (allUsers as any[]).find((u: any) => u.email.toLowerCase() === targetEmail);
    
    if (!recipient) {
      res.status(404).json({ error: "No user found with this email" });
      return;
    }

    res.json({
      verified: true,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      amount,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. POST /points/transfer/confirm - Complete the points transfer
router.post("/points/transfer/confirm", requireAuth, transferRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = TransferConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, amount: parsedAmount } = parsed.data;

  // Find recipient first
  const allUsers = await db.select().from(usersTable);
  const targetEmail = email.trim().toLowerCase();
  const recipient = (allUsers as any[]).find((u: any) => u.email.toLowerCase() === targetEmail);
  if (!recipient) {
    res.status(404).json({ error: "Recipient not found" });
    return;
  }

  const senderId = req.user!.id;
  const recipientId = recipient.id;

  if (recipientId === senderId) {
    res.status(400).json({ error: "Cannot transfer points to your own email" });
    return;
  }

  // Acquire sequential locks on both sender and recipient to prevent Race Conditions / Double-Spend
  const releaseLock = await acquireDoubleUserLock(senderId, recipientId);

  try {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
    if (!sender) {
      res.status(404).json({ error: "Sender not found" });
      return;
    }

    const [recipientFresh] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId));
    if (!recipientFresh) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }

    // Cryptographic validation of both balances
    const senderOk = await verifyAndHardenUserBalance(sender);
    const recipientOk = await verifyAndHardenUserBalance(recipientFresh);
    if (!senderOk || !recipientOk) {
      res.status(400).json({ error: "Security validation error: Wallet balance integrity check failed. Operation aborted." });
      return;
    }
    
    if ((sender.points || 0) < parsedAmount) {
      res.status(400).json({ error: "Insufficient points" });
      return;
    }

    const newSenderBalance = (sender.points || 0) - parsedAmount;
    const newRecipientBalance = (recipientFresh.points || 0) + parsedAmount;

    // Deduct points from sender & Sign balance
    await updateAndSignUserBalance(senderId, newSenderBalance);

    // Add points to receiver & Sign balance
    await updateAndSignUserBalance(recipientId, newRecipientBalance);

    // Insert secured transaction with hash chaining
    await insertSecureTransaction(
      senderId,
      recipientId,
      parsedAmount,
      "transfer",
      `Transfer to ${recipientFresh.name} (${recipientFresh.email})`
    );

    await logAuditEvent({ action: "points_transfer", userId: senderId, targetType: "transfer", details: { recipientId, recipientEmail: recipientFresh.email, amount: parsedAmount }, req });

    res.json({
      success: true,
      message: `Successfully transferred ${parsedAmount} points to ${recipientFresh.name}`,
      newBalance: newSenderBalance,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    releaseLock();
  }
});

// =============================================
// ADMIN ROUTES
// =============================================

// A1. GET /admin/deposit-requests - View all requests
router.get("/admin/deposit-requests", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const allDeposits = await db.select().from(depositRequestsTable);
    const sortedDeposits = allDeposits.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allUsers = await db.select().from(usersTable);
    const userMap = new Map((allUsers as any[]).map((u: any) => [u.id, u]));

    const mapped = (sortedDeposits as any[]).map((d: any) => {
      const u = userMap.get(d.userId) as any;
      return serializeDeposit(d, u?.name || "Unknown User", u?.email || "unknown@domain.com");
    });

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A2. POST /admin/deposit-requests/:id/approve - Approve request
router.post("/admin/deposit-requests/:id/approve", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const depositId = parseInt(req.params.id as string, 10);
  if (isNaN(depositId)) {
    res.status(400).json({ error: "Invalid deposit request id" });
    return;
  }

  const [deposit] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, depositId));
  if (!deposit) {
    res.status(404).json({ error: "Deposit request not found" });
    return;
  }

  if ((deposit as any).status !== "pending") {
    res.status(400).json({ error: `Request has already been ${(deposit as any).status}` });
    return;
  }

  const userId = (deposit as any).userId;

  // Lock the user to prevent race conditions during point assignment
  const releaseLock = await acquireUserLock(userId);

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User associated with this request not found" });
      return;
    }

    // Verify current balance integrity before adding points
    const isIntegrityOk = await verifyAndHardenUserBalance(user);
    if (!isIntegrityOk) {
      res.status(400).json({ error: "Security warning: User balance integrity check failed. Request cannot be approved." });
      return;
    }

    // Refresh request status inside the lock boundary to be absolutely certain it's still pending
    const [freshDeposit] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, depositId));
    if (!freshDeposit || freshDeposit.status !== "pending") {
      res.status(400).json({ error: "Request status has changed. Approval aborted." });
      return;
    }

    const newPointsBalance = (user.points || 0) + (deposit as any).pointsAmount;

    // Add points & update user's balance signature
    await updateAndSignUserBalance(userId, newPointsBalance);

    const { adminNotes } = req.body;
    const [updatedDeposit] = await db.update(depositRequestsTable)
      .set({ 
        status: "approved", 
        adminNotes: adminNotes ? String(adminNotes).trim() : "Approved by administrator",
        updatedAt: new Date()
      })
      .where(eq(depositRequestsTable.id, depositId))
      .returning();

    // Insert secured transaction with hash chain
    await insertSecureTransaction(
      null,
      userId,
      (deposit as any).pointsAmount,
      "deposit",
      `Deposit approval: ${(deposit as any).cashAmount} recharge`
    );

    await logAuditEvent({ action: "deposit_approved", userId: req.user!.id, targetType: "deposit", targetId: depositId, details: { targetUserId: userId, pointsAmount: (deposit as any).pointsAmount, cashAmount: (deposit as any).cashAmount }, req });

    res.json(serializeDeposit(updatedDeposit, user.name, user.email));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    releaseLock();
  }
});

// A3. POST /admin/deposit-requests/:id/reject - Reject request
router.post("/admin/deposit-requests/:id/reject", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const depositId = parseInt(req.params.id as string, 10);
    if (isNaN(depositId)) {
      res.status(400).json({ error: "Invalid deposit request id" });
      return;
    }

    const [deposit] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, depositId));
    if (!deposit) {
      res.status(404).json({ error: "Deposit request not found" });
      return;
    }

    if ((deposit as any).status !== "pending") {
      res.status(400).json({ error: `Request has already been ${(deposit as any).status}` });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, (deposit as any).userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { adminNotes } = req.body;
    const [updatedDeposit] = await db.update(depositRequestsTable)
      .set({ 
        status: "rejected", 
        adminNotes: adminNotes ? String(adminNotes).trim() : "Rejected by administrator",
        updatedAt: new Date()
      })
      .where(eq(depositRequestsTable.id, depositId))
      .returning();

    await logAuditEvent({ action: "deposit_rejected", userId: req.user!.id, targetType: "deposit", targetId: depositId, details: { targetUserId: (deposit as any).userId, adminNotes }, req });
    res.json(serializeDeposit(updatedDeposit, (user as any).name, (user as any).email));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A4. GET /admin/discount-codes - List all discount codes
router.get("/admin/discount-codes", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const codes = await db.select().from(discountCodesTable);
    const sorted = (codes as any[]).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted.map(serializeDiscountCode));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A5. POST /admin/discount-codes - Create discount code
router.post("/admin/discount-codes", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = AdminDiscountCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { code, discountType, discountValue, maxUses, expiresAt, description } = parsed.data;

    // Check uniqueness
    const existing = await db.select().from(discountCodesTable);
    const duplicate = (existing as any[]).find((c: any) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (duplicate) {
      res.status(409).json({ error: "A discount code with this name already exists" });
      return;
    }

    const [newCode] = await db.insert(discountCodesTable).values({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description: description ? description.trim() : null,
      isActive: true,
      usedCount: 0,
    }).returning();

    res.status(201).json(serializeDiscountCode(newCode));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A6. PATCH /admin/discount-codes/:id - Toggle active status or update
router.patch("/admin/discount-codes/:id", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const codeId = parseInt(req.params.id as string, 10);
    const { isActive, description, maxUses } = req.body;
    
    const [existing] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, codeId));
    if (!existing) {
      res.status(404).json({ error: "Discount code not found" });
      return;
    }

    const updateData: any = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (description !== undefined) updateData.description = String(description).trim();
    if (maxUses !== undefined) updateData.maxUses = maxUses === null ? null : parseInt(maxUses, 10);

    const [updated] = await db.update(discountCodesTable)
      .set(updateData)
      .where(eq(discountCodesTable.id, codeId))
      .returning();

    res.json(serializeDiscountCode(updated));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A7. DELETE /admin/discount-codes/:id - Delete discount code
router.delete("/admin/discount-codes/:id", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const codeId = parseInt(req.params.id as string, 10);
    await db.delete(discountCodesTable).where(eq(discountCodesTable.id, codeId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A8. GET /admin/payment-methods - List payment methods
router.get("/admin/payment-methods", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const methods = await db.select().from(paymentMethodsTable);
    const sorted = (methods as any[]).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    res.json(sorted.map(serializePaymentMethod));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A9. POST /admin/payment-methods - Create payment method
router.post("/admin/payment-methods", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = AdminPaymentMethodSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { name, accountName, accountNumber, icon, instructions, isActive, sortOrder } = parsed.data;

    const [newMethod] = await db.insert(paymentMethodsTable).values({
      name: name.trim(),
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      icon: icon ? icon.trim() : "💳",
      instructions: instructions ? instructions.trim() : null,
      isActive: isActive !== false,
      sortOrder: sortOrder ? parseInt(sortOrder as any, 10) : 0,
    }).returning();

    res.status(201).json(serializePaymentMethod(newMethod));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A10. PATCH /admin/payment-methods/:id - Update payment method
router.patch("/admin/payment-methods/:id", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const methodId = parseInt(req.params.id as string, 10);
    const { name, accountName, accountNumber, icon, instructions, isActive, sortOrder } = req.body;
    
    const [existing] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, methodId));
    if (!existing) {
      res.status(404).json({ error: "Payment method not found" });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (accountName !== undefined) updateData.accountName = String(accountName).trim();
    if (accountNumber !== undefined) updateData.accountNumber = String(accountNumber).trim();
    if (icon !== undefined) updateData.icon = String(icon).trim();
    if (instructions !== undefined) updateData.instructions = String(instructions).trim();
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder, 10);

    const [updated] = await db.update(paymentMethodsTable)
      .set(updateData)
      .where(eq(paymentMethodsTable.id, methodId))
      .returning();

    res.json(serializePaymentMethod(updated));
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A11. DELETE /admin/payment-methods/:id - Delete payment method
router.delete("/admin/payment-methods/:id", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const methodId = parseInt(req.params.id as string, 10);
    await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, methodId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A12. GET /admin/platform-settings - Get all settings
router.get("/admin/platform-settings", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const dbSettings = await db.select().from(platformSettingsTable);
    const dbMap: Record<string, string> = {};
    for (const s of dbSettings as any[]) {
      dbMap[s.key] = s.value;
    }

    // Build full list merging DB values with defaults
    const result = Object.entries(DEFAULT_SETTINGS).map(([key, def]) => ({
      key,
      value: dbMap[key] ?? def.value,
      label: def.label,
    }));

    // Also add any DB settings not in DEFAULT_SETTINGS (custom keys)
    for (const [key, val] of Object.entries(dbMap)) {
      if (!DEFAULT_SETTINGS[key]) {
        result.push({ key, value: val, label: key });
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A13. POST /admin/platform-settings - Upsert settings
router.post("/admin/platform-settings", requireAuth, requireRole(["admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { settings } = req.body; // Array of { key, value }
    if (!Array.isArray(settings) || settings.length === 0) {
      res.status(400).json({ error: "settings array is required" });
      return;
    }

    const existing = await db.select().from(platformSettingsTable);
    const existingMap = new Map((existing as any[]).map((s: any) => [s.key, s]));

    for (const { key, value } of settings) {
      if (!key || value === undefined) continue;
      if (existingMap.has(key)) {
        await db.update(platformSettingsTable)
          .set({ value: String(value), updatedAt: new Date() })
          .where(eq(platformSettingsTable.key, key));
      } else {
        await db.insert(platformSettingsTable).values({
          key,
          value: String(value),
          label: DEFAULT_SETTINGS[key]?.label || key,
          updatedAt: new Date(),
        });
      }
    }

    await logAuditEvent({ action: "platform_settings_update", userId: req.user!.id, targetType: "platform_settings", targetId: 0, details: { keys: settings.map((s: any) => s.key) }, req });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A14. GET /admin/analytics - Points system analytics
router.get("/admin/analytics", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const allTransactions = await db.select().from(pointsTransactionsTable);
    const allDeposits = await db.select().from(depositRequestsTable);
    const allUsers = await db.select().from(usersTable);

    const txns = allTransactions as any[];
    const deps = allDeposits as any[];
    const users = allUsers as any[];

    const totalPointsSold = deps
      .filter((d: any) => d.status === "approved")
      .reduce((sum: number, d: any) => sum + (d.pointsAmount || 0), 0);

    const totalRevenueCents = totalPointsSold * 2; // 1 point = 2 cents
    const totalRevenueDollars = totalRevenueCents / 100;

    const pendingDeposits = deps.filter((d: any) => d.status === "pending").length;
    const approvedDeposits = deps.filter((d: any) => d.status === "approved").length;
    const rejectedDeposits = deps.filter((d: any) => d.status === "rejected").length;

    const consultationPayments = txns.filter((t: any) => t.type === "consultation_payment");
    const totalConsultations = consultationPayments.length;
    const totalPointsEarned = consultationPayments.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const transfers = txns.filter((t: any) => t.type === "transfer");

    const totalUsersWithPoints = users.filter((u: any) => (u.points || 0) > 0).length;
    const totalPointsInCirculation = users.reduce((sum: number, u: any) => sum + (u.points || 0), 0);

    // Daily stats for last 7 days
    const now = new Date();
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dateStr = day.toISOString().split("T")[0];
      const dayDeposits = deps.filter((d: any) => {
        const dStr = (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)).toISOString().split("T")[0];
        return dStr === dateStr && d.status === "approved";
      });
      const dayPoints = dayDeposits.reduce((s: number, d: any) => s + (d.pointsAmount || 0), 0);
      return { date: dateStr, points: dayPoints, revenue: (dayPoints * 2) / 100 };
    }).reverse();

    res.json({
      overview: {
        totalPointsSold,
        totalRevenueDollars: totalRevenueDollars.toFixed(2),
        totalConsultations,
        totalPointsEarned,
        totalTransfers: transfers.length,
        totalUsersWithPoints,
        totalPointsInCirculation,
        pendingDeposits,
        approvedDeposits,
        rejectedDeposits,
      },
      dailyStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A15. GET /admin/security-audit - Run full security audit
router.get("/admin/security-audit", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const { verifyTransactionChainIntegrity, detectAnomalies } = await import("../services/wallet-security");
    
    const chainResult = await verifyTransactionChainIntegrity();
    const anomalies = await detectAnomalies();

    res.json({
      chainIntegrity: chainResult,
      anomalies,
      timestamp: new Date().toISOString(),
      status: chainResult.valid && anomalies.length === 0 ? "HEALTHY" : "ALERT",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// A16. POST /admin/migrate-chain - Re-sign all legacy transactions
router.post("/admin/migrate-chain", requireAuth, requireRole(["admin"]), async (_req, res): Promise<void> => {
  try {
    const { migrateLegacyTransactions } = await import("../services/wallet-security");
    const result = await migrateLegacyTransactions();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
