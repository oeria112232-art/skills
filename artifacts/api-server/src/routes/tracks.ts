import { Router } from "express";
import { db, tracksTable, trackModulesTable, userProgressTable, usersTable, certificatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetTrackParams, GetTrackProgressParams, UpdateTrackProgressParams, UpdateTrackProgressBody } from "@workspace/api-zod";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
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

const TrackBodySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  estimatedHours: z.number().int().nonnegative().optional(),
  iconUrl: z.string().url().optional().nullable(),
  instructorId: z.number().int().positive().optional().nullable(),
  price: z.number().int().nonnegative().optional().default(0),
});

const ModuleBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["lesson", "video", "quiz", "exercise"]),
  estimatedMinutes: z.number().int().nonnegative().optional().default(15),
  content: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

// Track CRUD
router.get("/tracks", async (_req, res): Promise<void> => {
  const tracks = await db.select().from(tracksTable).orderBy(tracksTable.id);
  const users = await db.select().from(usersTable);
  const instructorMap = new Map(users.map(u => [u.id, u]));
  res.json(tracks.map(t => {
    const inst = (t as any).instructorId ? instructorMap.get((t as any).instructorId) : null;
    return {
      ...t,
      price: t.price ?? 0,
      createdAt: t.createdAt?.toISOString(),
      instructorName: inst?.name || null,
      instructorAvatar: inst?.avatarUrl || null,
    };
  }));
});

router.post("/tracks", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const parsed = TrackBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const newTrack = await db.insert(tracksTable).values({
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description || "",
    category: parsed.data.category || "",
    level: parsed.data.level || "",
    estimatedHours: parsed.data.estimatedHours || 0,
    iconUrl: parsed.data.iconUrl || null,
    instructorId: parsed.data.instructorId || null,
    price: parsed.data.price || 0,
  }).returning();
  res.status(201).json(newTrack[0]);
});

router.put("/tracks/:id", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const parsed = TrackBodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid track ID" }); return; }
  const updated = await db.update(tracksTable).set({
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description,
    category: parsed.data.category,
    level: parsed.data.level,
    estimatedHours: parsed.data.estimatedHours,
    iconUrl: parsed.data.iconUrl,
    instructorId: parsed.data.instructorId,
    price: parsed.data.price,
  }).where(eq(tracksTable.id, id)).returning();
  res.json(updated[0]);
});

router.delete("/tracks/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid track ID" }); return; }
  await db.delete(tracksTable).where(eq(tracksTable.id, id));
  res.status(204).send();
});

// Module CRUD
router.get("/tracks/:trackId/modules", async (req, res): Promise<void> => {
  const trackId = parseInt(req.params.trackId as string);
  if (isNaN(trackId)) { res.status(400).json({ error: "Invalid trackId" }); return; }
  const modules = await db.select().from(trackModulesTable).where(eq(trackModulesTable.trackId, trackId));
  res.json(modules);
});

router.post("/tracks/:trackId/modules", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const trackId = parseInt(req.params.trackId as string);
  if (isNaN(trackId)) { res.status(400).json({ error: "Invalid trackId" }); return; }
  const parsed = ModuleBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const newModule = await db.insert(trackModulesTable).values({
    trackId,
    title: parsed.data.title,
    description: parsed.data.description || "",
    type: parsed.data.type,
    estimatedMinutes: parsed.data.estimatedMinutes || 15,
    content: parsed.data.content || "",
    order: parsed.data.sortOrder || 0,
  }).returning();
  const allModules = await db.select().from(trackModulesTable).where(eq(trackModulesTable.trackId, trackId));
  await db.update(tracksTable).set({ moduleCount: allModules.length }).where(eq(tracksTable.id, trackId));
  res.status(201).json(newModule[0]);
});

router.put("/modules/:id", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const parsed = ModuleBodySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid module ID" }); return; }
  const updated = await db.update(trackModulesTable).set({
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    estimatedMinutes: parsed.data.estimatedMinutes,
    content: parsed.data.content,
    order: parsed.data.sortOrder,
  }).where(eq(trackModulesTable.id, id)).returning();
  res.json(updated[0]);
});

router.delete("/modules/:id", requireAuth, requireRole(["admin"]), async (req, res): Promise<void> => {
  const moduleId = parseInt(req.params.id as string);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module ID" }); return; }
  const [mod] = await db.select().from(trackModulesTable).where(eq(trackModulesTable.id, moduleId));
  if (mod) {
    await db.delete(trackModulesTable).where(eq(trackModulesTable.id, moduleId));
    const allModules = await db.select().from(trackModulesTable).where(eq(trackModulesTable.trackId, mod.trackId));
    await db.update(tracksTable).set({ moduleCount: allModules.length }).where(eq(tracksTable.id, mod.trackId));
  }
  res.status(204).send();
});

router.get("/tracks/:slug", async (req, res): Promise<void> => {
  const params = GetTrackParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }
  
  let instructorName = null;
  let instructorAvatar = null;
  if ((track as any).instructorId) {
    const [inst] = await db.select().from(usersTable).where(eq(usersTable.id, (track as any).instructorId));
    if (inst) {
      instructorName = inst.name;
      instructorAvatar = inst.avatarUrl;
    }
  }

  const modules = await db.select().from(trackModulesTable)
    .where(eq(trackModulesTable.trackId, track.id))
    .orderBy(trackModulesTable.order);
  res.json({
    ...track,
    createdAt: track.createdAt?.toISOString(),
    instructorName,
    instructorAvatar,
    modules: modules.map(m => ({ ...m, createdAt: m.createdAt?.toISOString() })),
  });
});

router.get("/tracks/:slug/progress", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetTrackProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const user = req.user!;
  const targetUserId = (user.role === "admin" || user.role === "instructor")
    ? parseInt(req.query.userId as string || String(user.id), 10)
    : user.id;
  if (isNaN(targetUserId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  const userId = targetUserId;
  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }

  const progress = await db.select().from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.trackId, track.id)));

  const completedModules = progress.filter(p => p.completed === 1).map(p => p.moduleId);
  const totalModules = track.moduleCount;
  const percentComplete = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

  res.json({
    userId, trackSlug: params.data.slug,
    completedModules, totalModules,
    percentComplete,
    points: completedModules.length * 10,
    isEnrolled: progress.length > 0,
  });
});

router.post("/tracks/:slug/enroll", requireAuth, paymentRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetTrackProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const user = req.user!;
  const targetUserId = (user.role === "admin" || user.role === "instructor")
    ? parseInt(req.body.userId as string || String(user.id), 10)
    : user.id;
  if (isNaN(targetUserId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  const userId = targetUserId;
  
  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }

  const price = track.price ?? 0;

  if (price > 0 && (user.role === "student" || user.role === "company")) {
    const releaseLock = await acquireUserLock(userId);
    try {
      const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }

      const isIntegrityOk = await verifyAndHardenUserBalance(dbUser);
      if (!isIntegrityOk) {
        res.status(400).json({ error: "Security warning: Balance integrity check failed." });
        return;
      }

      if ((dbUser.points || 0) < price) {
        res.status(400).json({ error: `Insufficient points. Track requires ${price} points. You have ${dbUser.points || 0}.` });
        return;
      }

      const idempotencyKey = req.headers["x-idempotency-key"] as string;
      if (idempotencyKey) {
        if (!(await claimNonce(idempotencyKey))) {
          res.status(409).json({ error: "Duplicate request detected." });
          return;
        }
      }

      const isDuplicate = await checkDuplicateTransaction(userId, "track_enrollment", price, 60);
      if (isDuplicate) {
        res.status(409).json({ error: "Duplicate transaction detected. Please wait before retrying." });
        return;
      }

      const newBalance = (dbUser.points || 0) - price;
      await updateAndSignUserBalance(userId, newBalance);
      await insertSecureTransaction(userId, 1, price, "track_enrollment", `Enroll: ${track.title.substring(0, 40)}`);
      await logAuditEvent({ action: "track_enroll_paid", userId, targetType: "track", targetId: track.id, details: { price, trackTitle: track.title }, req });
    } finally {
      releaseLock();
    }
  }

  // Fetch all modules of the track
  const modules = await db.select().from(trackModulesTable).where(eq(trackModulesTable.trackId, track.id));
  
  // Insert enrollment records (completed = 0) for any modules that don't have them
  const existing = await db.select().from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.trackId, track.id)));

  const existingModIds = new Set(existing.map(e => e.moduleId));

  for (const mod of modules) {
    if (!existingModIds.has(mod.id)) {
      await db.insert(userProgressTable).values({
        userId,
        trackId: track.id,
        moduleId: mod.id,
        completed: 0,
        completedAt: null
      });
    }
  }

  // Also increment track enrolledCount using a lock
  const releaseLock = await acquireUserLock(track.id);
  try {
    const [freshTrack] = await db.select().from(tracksTable).where(eq(tracksTable.id, track.id));
    await db.update(tracksTable)
      .set({ enrolledCount: (freshTrack?.enrolledCount || 0) + 1 })
      .where(eq(tracksTable.id, track.id));
  } finally {
    releaseLock();
  }

  if (price > 0) {
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, isEnrolled: true, percentComplete: 0, pointsSpent: price, remainingPoints: freshUser?.points || 0 });
  } else {
    res.json({ success: true, isEnrolled: true, percentComplete: 0 });
  }
});

router.post("/tracks/:slug/progress", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateTrackProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const parsed = UpdateTrackProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const user = req.user!;
  if (user.role !== "admin" && user.role !== "instructor" && parsed.data.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }

  const existing = await db.select().from(userProgressTable)
    .where(and(
      eq(userProgressTable.userId, parsed.data.userId),
      eq(userProgressTable.trackId, track.id),
      eq(userProgressTable.moduleId, parsed.data.moduleId)
    ));

  if (existing.length > 0) {
    await db.update(userProgressTable)
      .set({ completed: parsed.data.completed ? 1 : 0, completedAt: parsed.data.completed ? new Date() : null })
      .where(eq(userProgressTable.id, existing[0].id));
  } else {
    await db.insert(userProgressTable).values({
      userId: parsed.data.userId,
      trackId: track.id,
      moduleId: parsed.data.moduleId,
      completed: parsed.data.completed ? 1 : 0,
      completedAt: parsed.data.completed ? new Date() : null,
    });
  }

  const progress = await db.select().from(userProgressTable)
    .where(and(eq(userProgressTable.userId, parsed.data.userId), eq(userProgressTable.trackId, track.id)));
  const completedModules = progress.filter(p => p.completed === 1).map(p => p.moduleId);
  const totalModules = track.moduleCount;
  const percentComplete = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

  if (percentComplete === 100) {
    const [existingCert] = await db.select().from(certificatesTable)
      .where(and(eq(certificatesTable.trackId, track.id), eq(certificatesTable.userId, parsed.data.userId)));
    if (!existingCert) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
      if (u) {
        const certNumber = `CERT-TRK-${track.id}-${u.id}-${Date.now()}`;
        const verificationCode = `MH-VFY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomInt(1000, 10000)}`;
        const trackCertLevel = (track as any).certLevel ?? 3;
        const trackCertCost = (track as any).certCost ?? 250;
        const trackCertType = (track as any).certType ?? "track";
        const isFree = trackCertCost === 0;
        await db.insert(certificatesTable).values({
          userId: u.id,
          userName: u.name,
          trackId: track.id,
          trackTitle: track.title,
          type: trackCertType,
          score: 100,
          certificateNumber: certNumber,
          verificationCode,
          level: trackCertLevel,
          cost: trackCertCost,
          status: isFree ? "issued" : "locked",
          isPaid: isFree ? 1 : 0,
          signatureHash: "",
        } as any);
      }
    }
  }

  res.json({
    userId: parsed.data.userId, trackSlug: params.data.slug,
    completedModules, totalModules, percentComplete,
    points: completedModules.length * 10,
  });
});

router.patch("/tracks/:id", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const trackId = parseInt(req.params.id as string || "0", 10);
  if (isNaN(trackId) || trackId <= 0) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }

  const { certSignTitle, certSignName, certEkey } = req.body;
  const updateData: any = {};
  if (certSignTitle !== undefined) updateData.certSignTitle = certSignTitle;
  if (certSignName !== undefined) updateData.certSignName = certSignName;
  if (certEkey !== undefined) updateData.certEkey = certEkey;

  const [t] = await db.update(tracksTable).set(updateData).where(eq(tracksTable.id, trackId)).returning();
  if (!t) { res.status(404).json({ error: "Track not found" }); return; }
  res.json(t);
});

router.post("/tracks/:id/template", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const trackId = parseInt(req.params.id as string || "0", 10);
  if (isNaN(trackId) || trackId <= 0) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }

  const { fileName, fileType, base64Data } = req.body;
  if (!fileName || !fileType || !base64Data) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.id, trackId));
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let dataBuffer: Buffer;
    if (matches && matches.length === 3) {
      dataBuffer = Buffer.from(matches[2], "base64");
    } else {
      dataBuffer = Buffer.from(base64Data, "base64");
    }

    const tplExt = path.extname(fileName).toLowerCase() || ".pdf";
    const uploadsDir = path.resolve(__dirname, "../../../uploads/templates");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFileName = `track-${trackId}-template${tplExt}`;
    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, dataBuffer);

    const publicUrl = `/api/uploads/templates/${safeFileName}`;
    const [updatedTrack] = await db
      .update(tracksTable)
      .set({
        certTemplateUrl: publicUrl,
        certTemplateType: fileType
      })
      .where(eq(tracksTable.id, trackId))
      .returning();

    res.json(updatedTrack);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save track template" });
  }
});

router.delete("/tracks/:id/template", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const trackId = parseInt(req.params.id as string || "0", 10);
  if (isNaN(trackId) || trackId <= 0) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }

  const [updatedTrack] = await db
    .update(tracksTable)
    .set({
      certTemplateUrl: null,
      certTemplateType: "default"
    })
    .where(eq(tracksTable.id, trackId))
    .returning();

  if (!updatedTrack) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  res.json(updatedTrack);
});

export default router;
