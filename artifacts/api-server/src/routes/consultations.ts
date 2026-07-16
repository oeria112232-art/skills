import { Router } from "express";
import { db, consultationsTable, usersTable, pointsTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { 
  verifyAndHardenUserBalance, 
  updateAndSignUserBalance, 
  insertSecureTransaction, 
  acquireUserLock,
  checkDuplicateTransaction,
  claimNonce,
} from "../services/wallet-security";
import { consultationRateLimit } from "../middlewares/rateLimit";
import { logAuditEvent } from "../services/audit-log";

import { z } from "zod";

const router = Router();

const ConsultationBodySchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  assignedTo: z.string().optional().nullable(),
});

const ConsultationReplyBodySchema = z.object({
  response: z.string().min(1),
});

// 1. GET /consultations
router.get("/consultations", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const isStaff = req.user?.role === "admin" || req.user?.role === "instructor";
    
    let consultations;
    if (isStaff) {
      // Staff see all consultations
      consultations = await db.select().from(consultationsTable).orderBy(desc(consultationsTable.createdAt));
    } else {
      // Students see only their own consultations
      consultations = await db.select()
        .from(consultationsTable)
        .where(eq(consultationsTable.userId, req.user!.id))
        .orderBy(desc(consultationsTable.createdAt));
    }

    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));

    const results = consultations.map(c => {
      const student = userMap.get(c.userId);
      const assigned = c.assignedTo ? userMap.get(c.assignedTo) : null;
      const replier = c.repliedBy ? userMap.get(c.repliedBy) : null;
      return {
        ...c,
        userName: student?.name || "Student",
        userEmail: student?.email || "",
        assignedName: assigned?.name || "",
        repliedName: replier?.name || "",
        createdAt: c.createdAt.toISOString(),
        repliedAt: c.repliedAt ? c.repliedAt.toISOString() : undefined,
      };
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// All consultations cost a flat 100 points (1 point = 2 cents, so 100 points = $2)
const CONSULTATION_COST = 100;

router.post("/consultations", requireAuth, consultationRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = ConsultationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, title, message, assignedTo } = parsed.data;

  const cost = CONSULTATION_COST;
  const userId = req.user!.id;

  // Lock user to prevent concurrency issues/Double-Spend on points
  const releaseLock = await acquireUserLock(userId);
  let user: any;

  try {
    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!dbUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    user = dbUser;

    // Cryptographic validation of points balance integrity
    const isIntegrityOk = await verifyAndHardenUserBalance(user);
    if (!isIntegrityOk) {
      res.status(400).json({ error: "Security warning: Point balance integrity check failed. Consultation purchase denied." });
      return;
    }

    if ((user.points || 0) < cost) {
      res.status(400).json({ error: `Insufficient points. This consultation requires ${cost} points. You have ${user.points || 0}.` });
      return;
    }

    // Idempotency check
    const idempotencyKey = req.headers["x-idempotency-key"] as string;
    if (idempotencyKey) {
      if (!(await claimNonce(idempotencyKey))) {
        res.status(409).json({ error: "Duplicate request detected." });
        return;
      }
    }

    // Anti-fraud: check for duplicate transactions
    const isDuplicate = await checkDuplicateTransaction(userId, "consultation_payment", cost, 60);
    if (isDuplicate) {
      res.status(409).json({ error: "Duplicate transaction detected. Please wait before retrying." });
      return;
    }

    const newPointsBalance = (user.points || 0) - cost;

    // Deduct points & update signature
    await updateAndSignUserBalance(userId, newPointsBalance);

    // Insert secured transaction with hash chain
    await insertSecureTransaction(
      userId,
      1, // Credited to system/admin (receiverId: 1)
      cost,
      "consultation_payment",
      `Consultation Payment: ${title.substring(0, 30)}`
    );

    await logAuditEvent({ action: "consultation_paid", userId, targetType: "consultation", details: { cost, category, title: title.substring(0, 40) }, req });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
    return;
  } finally {
    releaseLock();
  }

  try {
    const [newConsultation] = await db.insert(consultationsTable).values({
      userId: req.user!.id,
      category,
      title,
      message,
      assignedTo: assignedTo ? parseInt(assignedTo, 10) : null,
      status: "pending",
    }).returning();

    const assignedUser = assignedTo ? (await db.select().from(usersTable).where(eq(usersTable.id, parseInt(assignedTo, 10))))[0] : null;

    res.status(201).json({
      ...newConsultation,
      userName: user.name || "Student",
      userEmail: user.email || "",
      assignedName: assignedUser?.name || "",
      repliedName: "",
      createdAt: newConsultation.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. POST /consultations/:id/reply
router.post("/consultations/:id/reply", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const isStaff = req.user?.role === "admin" || req.user?.role === "instructor";
    if (!isStaff) {
      res.status(403).json({ error: "Forbidden: Only admins and instructors can reply to consultations" });
      return;
    }

    const id = parseInt(req.params.id as string, 10);
    const parsed = ConsultationReplyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { response } = parsed.data;

    const [existing] = await db.select().from(consultationsTable).where(eq(consultationsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Consultation not found" });
      return;
    }

    const [updated] = await db.update(consultationsTable).set({
      response,
      repliedBy: req.user!.id,
      repliedAt: new Date(),
      status: "replied",
    }).where(eq(consultationsTable.id, id)).returning();

    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const student = userMap.get(updated.userId);
    const assigned = updated.assignedTo ? userMap.get(updated.assignedTo) : null;
    const replier = userMap.get(req.user!.id);

    res.json({
      ...updated,
      userName: student?.name || "Student",
      userEmail: student?.email || "",
      assignedName: assigned?.name || "",
      repliedName: replier?.name || "",
      createdAt: updated.createdAt.toISOString(),
      repliedAt: updated.repliedAt ? updated.repliedAt.toISOString() : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /consultations/:id/close
router.post("/consultations/:id/close", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [existing] = await db.select().from(consultationsTable).where(eq(consultationsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Consultation not found" });
      return;
    }

    const isStaff = req.user?.role === "admin" || req.user?.role === "instructor";
    if (!isStaff && existing.userId !== req.user!.id) {
      res.status(403).json({ error: "Forbidden: Cannot close someone else's consultation" });
      return;
    }

    const [updated] = await db.update(consultationsTable).set({
      status: "closed",
    }).where(eq(consultationsTable.id, id)).returning();

    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const student = userMap.get(updated.userId);
    const assigned = updated.assignedTo ? userMap.get(updated.assignedTo) : null;
    const replier = updated.repliedBy ? userMap.get(updated.repliedBy) : null;

    res.json({
      ...updated,
      userName: student?.name || "Student",
      userEmail: student?.email || "",
      assignedName: assigned?.name || "",
      repliedName: replier?.name || "",
      createdAt: updated.createdAt.toISOString(),
      repliedAt: updated.repliedAt ? updated.repliedAt.toISOString() : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
