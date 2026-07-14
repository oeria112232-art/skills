import { Router } from "express";
import { db, certificatesTable, usersTable, pointsTransactionsTable, platformSettingsTable, tracksTable, trackModulesTable, userProgressTable } from "@workspace/db";
import { eq, or, and, inArray } from "drizzle-orm";
import { GetCertificateParams } from "@workspace/api-zod";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { certVerifyRateLimit } from "../middlewares/rateLimit";
import {
  verifyAndHardenUserBalance,
  updateAndSignUserBalance,
  insertSecureTransaction,
  acquireUserLock,
  checkDuplicateTransaction,
  claimNonce,
} from "../services/wallet-security";
import { paymentRateLimit } from "../middlewares/rateLimit";
import { logAuditEvent } from "../services/audit-log";

const router = Router();

// HMAC secret key for certificate signatures
const CERT_SIGN_SECRET = process.env.SESSION_SECRET;
if (!CERT_SIGN_SECRET) {
  console.error("FATAL: SESSION_SECRET must be set in environment variables.");
  process.exit(1);
}

// Calculate cryptographic signature for a certificate
export function calculateSignature(cert: {
  id: number;
  userId: number;
  type: string;
  score: number;
  certificateNumber: string;
}) {
  const data = `${cert.id}:${cert.userId}:${cert.type}:${cert.score}:${cert.certificateNumber}`;
  return crypto.createHmac("sha256", CERT_SIGN_SECRET).update(data).digest("hex");
}

function serializeCert(c: typeof certificatesTable.$inferSelect) {
  return {
    ...c,
    issuedAt: (c.issuedAt || new Date()).toISOString(),
  };
}

import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

// 1. GET /certificates - List user's certificates (Locked and Issued)
router.get("/certificates", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  let certs;
  if (user.role === "admin" || user.role === "instructor") {
    certs = await db.select().from(certificatesTable).orderBy(certificatesTable.issuedAt);
  } else {
    certs = await db.select().from(certificatesTable)
      .where(eq(certificatesTable.userId, user.id))
      .orderBy(certificatesTable.issuedAt);
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const paginated = certs.slice(offset, offset + limit);
  res.json({ data: paginated.map(serializeCert), total: certs.length, limit, offset });
});

// 2. POST /certificates - Generate new certificate (Admin only)
router.post("/certificates", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const { userId, userName, workshopId, workshopTitle, trackId, trackTitle, type, score, level, cost } = req.body;
  if (!userId || !userName || !type) {
    res.status(400).json({ error: "userId, userName, and type are required" });
    return;
  }

  const idSuffix = type === "track" ? `TRK-${trackId}` : `WSH-${workshopId}`;
  const certNumber = `CERT-${idSuffix}-${userId}-${Date.now()}`;
  const verificationCode = `MH-VFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Default cost and level based on type if not provided
  const lvl = level !== undefined ? Number(level) : (type === "participation" ? 1 : type === "track" ? 3 : 2);
  const cst = cost !== undefined ? Number(cost) : (type === "participation" ? 0 : type === "track" ? 250 : 100);

  const [cert] = await db.insert(certificatesTable).values({
    userId,
    userName,
    workshopId: workshopId || null,
    workshopTitle: workshopTitle || null,
    trackId: trackId || null,
    trackTitle: trackTitle || null,
    type,
    score: score !== undefined ? Number(score) : 100,
    certificateNumber: certNumber,
    verificationCode,
    level: lvl,
    cost: cst,
    status: cst === 0 ? "issued" : "locked",
    isPaid: cst === 0 ? 1 : 0,
    signatureHash: "",
  }).returning();

  // If free, generate signature hash immediately
  if (cst === 0) {
    const signature = calculateSignature(cert);
    await db.update(certificatesTable)
      .set({ signatureHash: signature })
      .where(eq(certificatesTable.id, cert.id));
    cert.signatureHash = signature;
  }

  res.status(201).json(serializeCert(cert));
  await logAuditEvent({ action: "certificate_create", userId: req.user!.id, targetType: "certificate", targetId: cert.id, details: { type, userName }, req });
});

// 3. GET /certificates/verify/:code - Public certificate verification (NO AUTH REQUIRED)
router.get("/certificates/verify/:code", certVerifyRateLimit, async (req, res): Promise<void> => {
  const code = req.params.code;
  if (!code) {
    res.status(400).json({ error: "Verification code is required" });
    return;
  }

  // Find certificate by code or number
  const certs = await db.select().from(certificatesTable).where(
    or(
      eq(certificatesTable.verificationCode, code.toUpperCase()),
      eq(certificatesTable.certificateNumber, code)
    )
  );

  if (certs.length === 0) {
    res.json({ verified: false, error: "Certificate not found / لم يتم العثور على الشهادة" });
    return;
  }

  const cert = certs[0];

  // Verify only "issued" certificates
  if (cert.status !== "issued") {
    res.json({ verified: false, error: "Certificate has not been issued yet / لم يتم إصدار الشهادة بعد" });
    return;
  }

  // Recalculate signature hash to check for database tampering
  const calculatedSig = calculateSignature(cert);
  const isValid = cert.signatureHash === calculatedSig;

  res.json({
    verified: isValid,
    certificate: serializeCert(cert),
    error: isValid ? null : "Cryptographic signature mismatch. Potential tampering detected! / تنبيه: خطأ في مطابقة التوقيع الرقمي للشهادة!"
  });
});

// 4. POST /certificates/:id/claim - Claim/Unlock certificate using Points
router.post("/certificates/:id/claim", requireAuth, paymentRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const certId = parseInt(req.params.id as string, 10);
  if (isNaN(certId)) {
    res.status(400).json({ error: "Invalid certificate id" });
    return;
  }

  const user = req.user!;
  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, certId));
  if (!cert) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  if (cert.userId !== user.id) {
    res.status(403).json({ error: "Forbidden: Cannot claim someone else's certificate" });
    return;
  }

  if (cert.status === "issued") {
    res.status(400).json({ error: "Certificate is already issued / تم إصدار الشهادة بالفعل" });
    return;
  }

  const cost = cert.cost || 0;

  if (cost > 0) {
    const releaseLock = await acquireUserLock(user.id);
    try {
      const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
      if (!dbUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const isIntegrityOk = await verifyAndHardenUserBalance(dbUser);
      if (!isIntegrityOk) {
        res.status(400).json({ error: "Security warning: Balance integrity check failed." });
        return;
      }

      if ((dbUser.points || 0) < cost) {
        res.status(400).json({ error: `Insufficient points. Requires ${cost} points. You have ${dbUser.points || 0}.` });
        return;
      }

      const idempotencyKey = req.headers["x-idempotency-key"] as string;
      if (idempotencyKey) {
        if (!claimNonce(idempotencyKey)) {
          res.status(409).json({ error: "Duplicate request detected." });
          return;
        }
      }

      const isDuplicate = await checkDuplicateTransaction(user.id, "certificate_purchase", cost, 60);
      if (isDuplicate) {
        res.status(409).json({ error: "Duplicate transaction detected. Please wait before retrying." });
        return;
      }

      const newBalance = (dbUser.points || 0) - cost;
      await updateAndSignUserBalance(user.id, newBalance);
      await insertSecureTransaction(user.id, 1, cost, "certificate_purchase", `Claim Certificate: ${cert.trackTitle || cert.workshopTitle || "Professional Certification"}`);
      await logAuditEvent({ action: "certificate_claim_paid", userId: user.id, targetType: "certificate", targetId: cert.id, details: { cost, certType: cert.type }, req });
    } finally {
      releaseLock();
    }
  }

  // Update status to issued and generate signature
  const signature = calculateSignature({
    id: cert.id,
    userId: cert.userId,
    type: cert.type,
    score: cert.score,
    certificateNumber: cert.certificateNumber
  });

  const [updated] = await db.update(certificatesTable).set({
    status: "issued",
    isPaid: 1,
    signatureHash: signature,
    issuedAt: new Date(),
  }).where(eq(certificatesTable.id, certId)).returning();

  if (cost > 0) {
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
    res.json({ ...serializeCert(updated), pointsSpent: cost, remainingPoints: freshUser?.points || 0 });
  } else {
    res.json(serializeCert(updated));
  }
});

// 5. GET /certificates/:id - Get certificate details (Public but checks auth if locked)
router.get("/certificates/:id", async (req, res): Promise<void> => {
  const params = GetCertificateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, params.data.id));
  if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }

  // If locked, it is private and requires owner authentication
  if (cert.status === "locked") {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(403).json({ error: "Locked certificates are private / هذه الشهادة مغلقة وجميلة لصاحب الحساب فقط" });
      return;
    }
    // We don't have access to requireAuth directly as middleware for this route since we want it public for issued,
    // so we manually check token for locked certs
    try {
      const token = authHeader.replace("Bearer ", "");
      const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!JWT_SECRET) {
        res.status(500).json({ error: "Server configuration error" });
        return;
      }
      const verified = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, verified.userId));
      if (!u || (u.role !== "admin" && u.role !== "instructor" && cert.userId !== u.id)) {
        res.status(403).json({ error: "Forbidden: Cannot view locked certificate" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid token" });
      return;
    }
  }

  res.json(serializeCert(cert));
});

// 6. DELETE /certificates/:id - Revoke/Delete certificate (Admin only)
router.delete("/certificates/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const certId = parseInt(req.params.id as string, 10);
  if (isNaN(certId)) {
    res.status(400).json({ error: "Invalid certificate id" });
    return;
  }

  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, certId));
  if (!cert) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  await db.delete(certificatesTable).where(eq(certificatesTable.id, certId));
  await logAuditEvent({ action: "certificate_revoke", userId: req.user!.id, targetType: "certificate", targetId: certId, details: { certNumber: cert.certificateNumber }, req });
  res.json({ success: true, message: "Certificate revoked successfully" });
});

// 7. POST /certificates/batch-issue - Issue certificates to all eligible students (Admin only)
router.post("/certificates/batch-issue", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const { type, entityId, score } = req.body;
  if (!type || !entityId) {
    res.status(400).json({ error: "type and entityId are required" });
    return;
  }

  let entityTitle = "";
  let issuedCount = 0;
  let skippedCount = 0;

  if (type === "track") {
    const [track] = await db.select().from(tracksTable).where(eq(tracksTable.id, Number(entityId)));
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    entityTitle = track.title;

    // Find all users who have progress on this track
    const allProgress = await db.select().from(userProgressTable)
      .where(eq(userProgressTable.trackId, track.id));

    const moduleCount = track.moduleCount;
    if (moduleCount === 0) {
      res.json({ issuedCount: 0, skippedCount: 0, message: "Track has no modules" });
      return;
    }

    // Group progress by userId and count completed modules
    const userCompletion: Record<number, number> = {};
    for (const p of allProgress) {
      if (p.completed === 1) {
        userCompletion[p.userId] = (userCompletion[p.userId] || 0) + 1;
      }
    }

    // Find users with 100% completion
    const eligibleUserIds = Object.entries(userCompletion)
      .filter(([_, completed]) => completed >= moduleCount)
      .map(([userId]) => Number(userId));

    if (eligibleUserIds.length === 0) {
      res.json({ issuedCount: 0, skippedCount: 0, message: "No students completed this track yet" });
      return;
    }

    // Get existing certificates for this track
    const existingCerts = await db.select().from(certificatesTable)
      .where(and(
        eq(certificatesTable.trackId, track.id),
        inArray(certificatesTable.userId, eligibleUserIds)
      ));
    const alreadyCertified = new Set(existingCerts.map(c => c.userId));

    // Issue certificates to eligible users who don't have one
    const usersToIssue = eligibleUserIds.filter(id => !alreadyCertified.has(id));
    skippedCount = alreadyCertified.size;

    for (const userId of usersToIssue) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!u) continue;

      const certNumber = `CERT-TRK-${track.id}-${u.id}-${Date.now()}`;
      const verificationCode = `MH-VFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.insert(certificatesTable).values({
        userId: u.id,
        userName: u.name,
        trackId: track.id,
        trackTitle: track.title,
        type: "track",
        score: score !== undefined ? Number(score) : 100,
        certificateNumber: certNumber,
        verificationCode,
        level: 3,
        cost: 250,
        status: "locked",
        isPaid: 0,
        signatureHash: "",
      } as any);
      issuedCount++;
    }
  } else if (type === "workshop") {
    const { workshopsTable } = await import("@workspace/db");
    const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, Number(entityId)));
    if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
    entityTitle = workshop.title;

    // For workshops, get all users (excluding admins/instructors) who don't already have a cert
    const allUsers = await db.select().from(usersTable);
    const eligibleUsers = allUsers.filter(u => u.role !== "admin" && u.role !== "instructor");

    const existingCerts = await db.select().from(certificatesTable)
      .where(and(
        eq(certificatesTable.workshopId, workshop.id),
        inArray(certificatesTable.userId, eligibleUsers.map(u => u.id))
      ));
    const alreadyCertified = new Set(existingCerts.map(c => c.userId));

    const usersToIssue = eligibleUsers.filter(u => !alreadyCertified.has(u.id));
    skippedCount = alreadyCertified.size;

    for (const u of usersToIssue) {
      const certNumber = `CERT-WSH-${workshop.id}-${u.id}-${Date.now()}`;
      const verificationCode = `MH-VFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.insert(certificatesTable).values({
        userId: u.id,
        userName: u.name,
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        type: "workshop",
        score: score !== undefined ? Number(score) : 100,
        certificateNumber: certNumber,
        verificationCode,
        level: 2,
        cost: 100,
        status: "locked",
        isPaid: 0,
        signatureHash: "",
      } as any);
      issuedCount++;
    }
  } else {
    res.status(400).json({ error: "type must be 'track' or 'workshop'" });
    return;
  }

  res.json({ issuedCount, skippedCount, entityTitle, message: `Issued ${issuedCount} certificates (${skippedCount} already had one)` });
});

export default router;
