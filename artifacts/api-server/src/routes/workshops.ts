import { Router } from "express";
import { 
  db, workshopsTable, enrollmentsTable, examQuestionsTable, 
  certificatesTable, usersTable, workshopQaTable, 
  workshopPollsTable, workshopPollVotesTable, workshopNotesTable,
  workshopSubscriptionsTable
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  ListWorkshopsQueryParams, CreateWorkshopBody,
  GetWorkshopParams, UpdateWorkshopParams, UpdateWorkshopBody, DeleteWorkshopParams,
  EnrollWorkshopParams, EnrollWorkshopBody, ListWorkshopEnrollmentsParams,
  GetWorkshopExamParams, AddExamQuestionParams, AddExamQuestionBody,
  SubmitExamParams, SubmitExamBody,
} from "@workspace/api-zod";
import { DailyService } from "../services/daily";
import { logger } from "../lib/logger";
import {
  verifyAndHardenUserBalance,
  updateAndSignUserBalance,
  insertSecureTransaction,
  acquireUserLock,
  checkDuplicateTransaction,
  claimNonce,
} from "../services/wallet-security";
import { paymentRateLimit, rateLimit } from "../middlewares/rateLimit";
import { logAuditEvent } from "../services/audit-log";

const workshopUploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "rl:wsh-upload",
  message: "تم تجاوز حد رفع الملفات. يرجى المحاولة بعد دقيقة.",
});

const router = Router();

function getDynamicStatus(dateStr: string, durationMin: number): "upcoming" | "ongoing" | "completed" {
  const startTime = new Date(dateStr).getTime();
  const endTime = startTime + (durationMin || 60) * 60 * 1000;
  const now = Date.now();
  
  if (now < startTime) {
    return "upcoming";
  } else if (now >= startTime && now <= endTime) {
    return "ongoing";
  } else {
    return "completed";
  }
}

function serializeWorkshop(w: typeof workshopsTable.$inferSelect) {
  let status = getDynamicStatus(w.date, w.duration);
  if (w.isClosed === 1) {
    status = "completed";
  } else if (w.dailyRoomUrl && status === "upcoming") {
    status = "ongoing";
  }
  return {
    ...w,
    status,
    price: w.price ?? 0,
    hasExam: w.hasExam !== undefined ? w.hasExam : 1,
    hasCertificate: w.hasCertificate !== undefined ? w.hasCertificate : 1,
    tags: w.tags ?? [],
    enrolledCount: w.enrolledCount,
    createdAt: w.createdAt.toISOString(),
  };
}

router.get("/workshops", async (req, res): Promise<void> => {
  const parsed = ListWorkshopsQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data : {};
  
  // Fetch all workshops
  const workshops = await db.select().from(workshopsTable).orderBy(workshopsTable.date);
  
  // Map/serialize to include dynamic status
  const serialized = workshops.map(serializeWorkshop);
  
  // Filter by status in memory
  const filtered = q.status ? serialized.filter(w => w.status === q.status) : serialized;

  // Pagination (optional limit/offset via query params)
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const paginated = filtered.slice(offset, offset + limit);

  res.json({ data: paginated, total: filtered.length, limit, offset });
});

import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

router.post("/workshops", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [w] = await db.insert(workshopsTable).values({ ...parsed.data, tags: parsed.data.tags ?? [] }).returning();
  await logAuditEvent({ action: "workshop_create", userId: req.user!.id, targetType: "workshop", targetId: w.id, details: { title: parsed.data.title }, req });
  res.status(201).json(serializeWorkshop(w));
});

router.get("/workshops/:id", async (req, res): Promise<void> => {
  const params = GetWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!w) { res.status(404).json({ error: "Workshop not found" }); return; }
  res.json(serializeWorkshop(w));
});

router.patch("/workshops/:id", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [w] = await db.update(workshopsTable).set(parsed.data).where(eq(workshopsTable.id, params.data.id)).returning();
  if (!w) { res.status(404).json({ error: "Workshop not found" }); return; }
  await logAuditEvent({ action: "workshop_update", userId: req.user!.id, targetType: "workshop", targetId: params.data.id, details: { fields: Object.keys(parsed.data) }, req });
  res.json(serializeWorkshop(w));
});

router.delete("/workshops/:id", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  await logAuditEvent({ action: "workshop_delete", userId: req.user!.id, targetType: "workshop", targetId: params.data.id, details: {}, req });
  res.sendStatus(204);
});

router.post("/workshops/:id/enroll", requireAuth, paymentRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = EnrollWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = EnrollWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  
  const user = req.user!;
  const targetUserId = (user.role === "admin" || user.role === "instructor") 
    ? (parsed.data.userId || user.id) 
    : user.id;

  const [existing] = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.workshopId, params.data.id), eq(enrollmentsTable.userId, targetUserId)));
  if (existing) {
    res.json({ ...existing, createdAt: existing.createdAt.toISOString() });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }

  const price = workshop.price ?? 0;

  if (price > 0 && (user.role === "student" || user.role === "company")) {
    const releaseLock = await acquireUserLock(targetUserId);
    try {
      // Re-check enrollment inside the lock to prevent race condition
      const [doubleCheck] = await db.select().from(enrollmentsTable)
        .where(and(eq(enrollmentsTable.workshopId, params.data.id), eq(enrollmentsTable.userId, targetUserId)));
      if (doubleCheck) {
        res.json({ ...doubleCheck, createdAt: doubleCheck.createdAt.toISOString() });
        return;
      }

      const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId));
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }

      const isIntegrityOk = await verifyAndHardenUserBalance(dbUser);
      if (!isIntegrityOk) {
        res.status(400).json({ error: "Security warning: Balance integrity check failed." });
        return;
      }

      if ((dbUser.points || 0) < price) {
        res.status(400).json({ error: `Insufficient points. Workshop requires ${price} points. You have ${dbUser.points || 0}.` });
        return;
      }

      const idempotencyKey = req.headers["x-idempotency-key"] as string;
      if (idempotencyKey) {
        if (!claimNonce(idempotencyKey)) {
          res.status(409).json({ error: "Duplicate request detected." });
          return;
        }
      }

      const isDuplicate = await checkDuplicateTransaction(targetUserId, "workshop_enrollment", price, 60);
      if (isDuplicate) {
        res.status(409).json({ error: "Duplicate transaction detected. Please wait before retrying." });
        return;
      }

      const newBalance = (dbUser.points || 0) - price;
      await updateAndSignUserBalance(targetUserId, newBalance);
      await insertSecureTransaction(targetUserId, 1, price, "workshop_enrollment", `Enroll: ${workshop.title.substring(0, 40)}`);
      await logAuditEvent({ action: "workshop_enroll_paid", userId: targetUserId, targetType: "workshop", targetId: workshop.id, details: { price, workshopTitle: workshop.title }, req });
    } finally {
      releaseLock();
    }
  }

  const [enrollment] = await db.insert(enrollmentsTable).values({
    workshopId: params.data.id,
    userId: targetUserId,
    userName: (user.role === "admin" || user.role === "instructor") ? parsed.data.userName : user.name,
    userEmail: (user.role === "admin" || user.role === "instructor") ? parsed.data.userEmail : user.email,
  }).returning();
  const [wsForCount] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  await db.update(workshopsTable)
    .set({ enrolledCount: (wsForCount?.enrolledCount || 0) + 1 })
    .where(eq(workshopsTable.id, params.data.id));

  if (price > 0) {
    const [freshUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId));
    res.status(201).json({ ...enrollment, createdAt: enrollment.createdAt.toISOString(), pointsSpent: price, remainingPoints: freshUser?.points || 0 });
  } else {
    res.status(201).json({ ...enrollment, createdAt: enrollment.createdAt.toISOString() });
  }
});

router.get("/workshops/:id/enrollments", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const params = ListWorkshopEnrollmentsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.workshopId, params.data.id));
  res.json(enrollments.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

function getDefaultQuestions(workshopId: number) {
  return [
    {
      id: 9991,
      workshopId: workshopId,
      question: "ما هو العنصر الأكثر أهمية لنجاح العمل الجماعي وإدارة المشاريع؟",
      options: [
        "التواصل الفعال والمستمر بين أعضاء الفريق",
        "العمل الفردي المستقل دون مشاركة المعلومات",
        "تجنب التخطيط المسبق للمشروع",
        "تقليل التواصل لتوفير الوقت"
      ],
      correctIndex: 0,
      points: 10,
      type: "mcq",
      order: 1
    },
    {
      id: 9992,
      workshopId: workshopId,
      question: "أي من المهارات التالية تعتبر من المهارات الناعمة (Soft Skills) الأساسية للنمو المهني؟",
      options: [
        "الذكاء العاطفي والقدرة على حل المشكلات والنزاعات",
        "كتابة الأكواد البرمجية فقط",
        "إعداد جداول البيانات الحسابية",
        "العمل لساعات طويلة دون فترات راحة"
      ],
      correctIndex: 0,
      points: 10,
      type: "mcq",
      order: 2
    },
    {
      id: 9993,
      workshopId: workshopId,
      question: "كيف يمكن للموظف الحفاظ على تطوره المهني ومواكبة متطلبات سوق العمل؟",
      options: [
        "التعلم الذاتي المستمر وتطبيق المهارات في ورش عملية",
        "الاعتماد الكامل على الشهادات القديمة دون تحديث",
        "تجنب خوض مجالات أو تجارب جديدة",
        "الانتظار السلبي دون المبادرة لطلب التعلم"
      ],
      correctIndex: 0,
      points: 10,
      type: "mcq",
      order: 3
    }
  ];
}

router.get("/workshops/:id/exam", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkshopExamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  
  const questions = await db.select().from(examQuestionsTable)
    .where(eq(examQuestionsTable.workshopId, params.data.id))
    .orderBy(examQuestionsTable.order);
    
  const activeQuestions = questions.length > 0 ? questions : (getDefaultQuestions(params.data.id) as any[]);
    
  let mappedQuestions = activeQuestions.map(q => ({
    id: q.id, 
    workshopId: q.workshopId, 
    question: q.question,
    options: q.options || [], 
    type: q.type || "mcq",
    points: q.points || 10,
    order: q.order,
  }));

  // Shuffle questions if enabled
  if (workshop.shuffleQuestions === 1) {
    for (let i = mappedQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
    }
  }

  res.json({
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    passScore: workshop.passScore,
    timeLimitMinutes: workshop.timeLimitMinutes,
    antiCheatEnabled: workshop.antiCheatEnabled === 1,
    maxFocusWarnings: workshop.maxFocusWarnings || 3,
    shuffleQuestions: workshop.shuffleQuestions === 1,
    questions: mappedQuestions,
  });
});

router.post("/workshops/:id/exam/submit", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = SubmitExamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SubmitExamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }

  const dbQuestions = await db.select().from(examQuestionsTable)
    .where(eq(examQuestionsTable.workshopId, params.data.id))
    .orderBy(examQuestionsTable.order);

  const questions = dbQuestions.length > 0 ? dbQuestions : (getDefaultQuestions(params.data.id) as any[]);

  const user = req.user!;
  
  const { answers, focusWarningsCount = 0, antiCheatViolated = false } = parsed.data;
  
  // Validate anti-cheat warnings and violations
  const isCheatViolation = antiCheatViolated || (workshop.antiCheatEnabled === 1 && focusWarningsCount > (workshop.maxFocusWarnings || 3));
  
  let score = 0;
  let passed = false;
  let message = "";
  let totalPoints = 0;
  let earnedPoints = 0;

  if (isCheatViolation) {
    score = 0;
    passed = false;
    message = "Your exam was immediately terminated and graded as 0% due to focus loss, tab switching, or exiting fullscreen.";
  } else {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAns = answers[i];
      const questionPoints = q.points || 10;
      totalPoints += questionPoints;
      
      if (q.type === "short_answer") {
        const correctText = String(q.correctAnswerText || "").trim().toLowerCase();
        const studentText = String(studentAns || "").trim().toLowerCase();
        if (correctText === studentText) {
          earnedPoints += questionPoints;
        }
      } else {
        if (studentAns !== undefined && Number(studentAns) === q.correctIndex) {
          earnedPoints += questionPoints;
        }
      }
    }
    
    score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    passed = score >= workshop.passScore;
    message = passed
      ? `Excellent! You scored ${score}% and earned your certificate!`
      : `You scored ${score}%. Minimum passing score is ${workshop.passScore}%.`;
  }

  let certificateId: number | null = null;
  if (passed && user) {
    const [existingCert] = await db.select().from(certificatesTable)
      .where(and(eq(certificatesTable.workshopId, workshop.id), eq(certificatesTable.userId, user.id)));

    if (existingCert) {
      certificateId = existingCert.id;
    } else {
      const certNumber = `CERT-WSH-${workshop.id}-${user.id}-${Date.now()}`;
      const verificationCode = `MH-VFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [cert] = await (db.insert(certificatesTable).values({
        userId: user.id,
        userName: user.name,
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        type: "workshop",
        score,
        certificateNumber: certNumber,
        verificationCode: verificationCode,
        level: 2, // Professional Specialist
        cost: 100, // 100 Points to claim
        status: "locked",
        isPaid: 0,
        signatureHash: "",
      } as any) as any).returning();
      certificateId = cert.id;
    }
    
    // Award XP/points
    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 100` as any })
      .where(eq(usersTable.id, user.id));
  }

  res.json({
    score, passed, total: questions.length, certificateIssued: passed && !!user,
    certificateId,
    message,
  });
});

router.post("/workshops/:id/exam/setup", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid workshop id" }); return; }
  const { questions } = req.body;
  if (!Array.isArray(questions)) { res.status(400).json({ error: "Questions must be an array" }); return; }

  // Clear existing questions for this workshop
  await db.delete(examQuestionsTable).where(eq(examQuestionsTable.workshopId, id));

  // Insert new questions if any
  if (questions.length > 0) {
    await db.insert(examQuestionsTable).values(
      questions.map((q: any, idx: number) => ({
        workshopId: id,
        question: q.question,
        options: q.options || [],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
        type: q.type || "mcq",
        correctAnswerText: q.correctAnswerText || "",
        points: q.points !== undefined ? q.points : 10,
        order: q.order ?? idx,
      }))
    );
  }
  res.json({ success: true });
});

router.delete("/workshops/:id/exam/questions/:questionId", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id, 10);
  const questionId = parseInt(req.params.questionId, 10);
  if (isNaN(workshopId) || isNaN(questionId)) {
    res.status(400).json({ error: "Invalid id params" });
    return;
  }
  await db.delete(examQuestionsTable).where(
    and(
      eq(examQuestionsTable.workshopId, workshopId),
      eq(examQuestionsTable.id, questionId)
    )
  );
  res.json({ success: true });
});

router.post("/workshops/:id/certificate/claim", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  
  const user = req.user!;
  const userId = user.id;
  
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  
  // Check if they are enrolled
  const [enrollment] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.workshopId, workshop.id), eq(enrollmentsTable.userId, userId)));
  if (!enrollment) { res.status(400).json({ error: "Not enrolled in this workshop" }); return; }
  
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }
  
  // Check if certificate already exists
  const [existingCert] = await db.select().from(certificatesTable).where(and(eq(certificatesTable.workshopId, workshop.id), eq(certificatesTable.userId, userId)));
  if (existingCert) {
    res.json({ success: true, certificateId: existingCert.id, alreadyClaimed: true });
    return;
  }
  
  // Generate and insert certificate
  const certNumber = `CERT-WSH-${workshop.id}-${dbUser.id}-${Date.now()}`;
  const verificationCode = `MH-VFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const [cert] = await (db.insert(certificatesTable).values({
    userId: dbUser.id,
    userName: dbUser.name,
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    type: "participation",
    score: 100,
    certificateNumber: certNumber,
    verificationCode: verificationCode,
    level: 1, // Associate Participation
    cost: 0, // Free
    status: "issued",
    isPaid: 1,
    signatureHash: "",
  } as any) as any).returning();

  const signatureKey = process.env.SESSION_SECRET || "mharat_secure_secret_key_8829";
  const data = `${cert.id}:${cert.userId}:${cert.type}:${cert.score}:${cert.certificateNumber}`;
  const signature = crypto.createHmac("sha256", signatureKey).update(data).digest("hex");

  await db.update(certificatesTable)
    .set({ signatureHash: signature })
    .where(eq(certificatesTable.id, cert.id));
  
  // Award XP/points
  await db.update(usersTable)
    .set({ points: sql`${usersTable.points} + 100` as any })
    .where(eq(usersTable.id, dbUser.id));
    
  res.status(201).json({ success: true, certificateId: cert.id, alreadyClaimed: false });
});

router.post("/workshops/:id/template", requireAuth, requireRole(["admin", "instructor"]), workshopUploadRateLimit, async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id || "0", 10);
  if (isNaN(workshopId) || workshopId <= 0) {
    res.status(400).json({ error: "Invalid workshop id" });
    return;
  }
  
  const { fileName, fileType, base64Data } = req.body;
  if (!fileName || !fileType || !base64Data) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Validate template file type
  const ALLOWED_TEMPLATE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/svg+xml"];
  const ALLOWED_TEMPLATE_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".svg"];
  const tplExt = path.extname(fileName).toLowerCase();
  if (!ALLOWED_TEMPLATE_TYPES.includes(fileType) && !ALLOWED_TEMPLATE_EXTS.includes(tplExt)) {
    res.status(400).json({ error: "Invalid template type. Allowed: pdf, jpg, png, svg" });
    return;
  }
  
  // Verify workshop exists
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  
  try {
    // Extract base64 payload
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let dataBuffer: Buffer;
    
    if (matches && matches.length === 3) {
      dataBuffer = Buffer.from(matches[2], "base64");
    } else {
      dataBuffer = Buffer.from(base64Data, "base64");
    }

    // Validate decoded file size (max 10MB for templates)
    if (dataBuffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: "Template file too large. Maximum 10MB allowed" });
      return;
    }
    
    // Create templates directory
    const uploadsDir = path.resolve(import.meta.dirname, "../../../uploads/templates");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save file locally
    const ext = tplExt || `.${fileType.split("/")[1] || "pdf"}`;
    const safeFileName = `workshop-${workshopId}-template${ext}`;
    const filePath = path.join(uploadsDir, safeFileName);
    
    fs.writeFileSync(filePath, dataBuffer);
    
    // Update workshop database record
    const publicUrl = `/api/uploads/templates/${safeFileName}`;
    const [updatedW] = await db.update(workshopsTable)
      .set({
        certTemplateUrl: publicUrl,
        certTemplateType: fileType
      })
      .where(eq(workshopsTable.id, workshopId))
      .returning();
      
    res.json(serializeWorkshop(updatedW));
  } catch (err: any) {
    console.error("Template upload error:", err);
    res.status(500).json({ error: "Failed to upload template file" });
  }
});

router.post("/workshops/:id/image", requireAuth, requireRole(["admin", "instructor"]), workshopUploadRateLimit, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId) || workshopId <= 0) {
    res.status(400).json({ error: "Invalid workshop id" });
    return;
  }
  
  const { fileName, fileType, base64Data } = req.body;
  if (!fileName || !fileType || !base64Data) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Validate file type — only allow image MIME types
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const fileExt = path.extname(fileName).toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(fileType) && !ALLOWED_IMAGE_EXTS.includes(fileExt)) {
    res.status(400).json({ error: "Invalid file type. Allowed: jpg, png, gif, webp, svg" });
    return;
  }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
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

    // Validate decoded file size (max 5MB for images)
    if (dataBuffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: "Image file too large. Maximum 5MB allowed" });
      return;
    }
    
    const uploadsDir = path.resolve(import.meta.dirname, "../../../uploads/covers");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const ext = fileExt || `.${fileType.split("/")[1] || "jpg"}`;
    const safeFileName = `workshop-${workshopId}-cover${ext}`;
    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, dataBuffer);
    
    const publicUrl = `/api/uploads/covers/${safeFileName}`;
    const [updatedW] = await db.update(workshopsTable)
      .set({ imageUrl: publicUrl })
      .where(eq(workshopsTable.id, workshopId))
      .returning();
      
    res.json(serializeWorkshop(updatedW));
  } catch (err: any) {
    console.error("Cover image upload error:", err);
    res.status(500).json({ error: "Failed to upload cover image" });
  }
});

// POST /workshops/:id/start-stream - Start streaming (Admin/Instructor only)
router.post("/workshops/:id/start-stream", requireAuth, requireRole(["admin", "instructor"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) {
    res.status(400).json({ error: "Invalid workshop id" });
    return;
  }

  const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!w) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }

  try {
    let roomUrl = w.dailyRoomUrl;
    let roomName = w.dailyRoomName;

    // Self-healing check: Verify if room still exists on Daily.co API
    if (roomName && process.env.DAILY_API_KEY) {
      try {
        const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: {
            "Authorization": `Bearer ${process.env.DAILY_API_KEY}`
          }
        });
        if (response.status === 404) {
          // Room does not exist anymore. Reset local variables to recreate it
          roomUrl = null;
          roomName = null;
        }
      } catch (checkErr) {
        logger.error({ checkErr }, "Failed to verify Daily room existence");
      }
    }

    // Create room if not already exists
    if (!roomUrl || !roomName) {
      const room = await DailyService.createDailyRoom(workshopId);
      roomUrl = room.url;
      roomName = room.name;

      await db.update(workshopsTable)
        .set({ dailyRoomUrl: roomUrl, dailyRoomName: roomName, isClosed: 0 })
        .where(eq(workshopsTable.id, workshopId));
    }

    // Generate secure moderator/owner token
    const token = await DailyService.generateMeetingToken(roomName!, {
      id: req.user!.id,
      name: req.user!.name,
      role: req.user!.role
    });

    res.json({
      roomUrl,
      roomName,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to initialize video room" });
  }
});

// GET /workshops/:id/join-stream - Join stream (Registered trainees, admins, and instructors only)
router.get("/workshops/:id/join-stream", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) {
    res.status(400).json({ error: "Invalid workshop id" });
    return;
  }

  const user = req.user!;

  // 1. Fetch workshop details
  const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
  if (!w) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }

  // 2. Strict Access Control Check: must be enrolled OR admin/instructor
  const isPrivileged = user.role === "admin" || user.role === "instructor";
  if (!isPrivileged) {
    const [enrollment] = await db.select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.workshopId, workshopId), eq(enrollmentsTable.userId, user.id)));
    
    if (!enrollment) {
      res.status(403).json({ error: "Access Denied: You must enroll in this workshop to join the stream / يجب التسجيل في هذه الورشة أولاً للمشاركة في البث" });
      return;
    }
  }

  // 3. Check if stream has been initialized/started
  if (!w.dailyRoomUrl || !w.dailyRoomName) {
    res.status(400).json({ error: "البث المباشر لم يبدأ بعد لهذه الورشة، يرجى المحاولة لاحقاً أو انتظار المدرب." });
    return;
  }

  // Self-healing check: verify if room still exists on Daily.co API
  if (w.dailyRoomName && process.env.DAILY_API_KEY) {
    try {
      const response = await fetch(`https://api.daily.co/v1/rooms/${w.dailyRoomName}`, {
        headers: {
          "Authorization": `Bearer ${process.env.DAILY_API_KEY}`
        }
      });
      if (response.status === 404) {
        // Room does not exist anymore! Clear it in db
        await db.update(workshopsTable)
          .set({ dailyRoomUrl: null, dailyRoomName: null, isClosed: 1 })
          .where(eq(workshopsTable.id, workshopId));
        
        res.status(400).json({ error: "انتهى البث المباشر لهذه الورشة." });
        return;
      }
    } catch (checkErr) {
      logger.error({ checkErr }, "Failed to verify room in join-stream");
    }
  }

  try {
    // 4. Generate secure participant meeting token with trainee's verified name
    const token = await DailyService.generateMeetingToken(w.dailyRoomName, {
      id: user.id,
      name: user.name,
      role: user.role
    });

    res.json({
      roomUrl: w.dailyRoomUrl,
      roomName: w.dailyRoomName,
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate meeting credentials" });
  }
});

// POST /workshops/:id/attendance - Log attendance minutes (Registered trainees only)
router.post("/workshops/:id/attendance", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) {
    res.status(400).json({ error: "Invalid workshop id" });
    return;
  }

  const { durationMinutes } = req.body;
  const minutes = Number(durationMinutes);
  if (isNaN(minutes) || minutes <= 0) {
    res.status(400).json({ error: "Invalid durationMinutes" });
    return;
  }

  const user = req.user!;
  
  // Find enrollment
  const [enrollment] = await db.select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.workshopId, workshopId), eq(enrollmentsTable.userId, user.id)));

  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found for this user in this workshop / المستخدم غير مسجل في هذه الورشة" });
    return;
  }

  const newTotal = (enrollment.attendedMinutes || 0) + minutes;

  const [updated] = await db.update(enrollmentsTable)
    .set({ attendedMinutes: newTotal })
    .where(eq(enrollmentsTable.id, enrollment.id))
    .returning();

  res.json({
    success: true,
    attendedMinutes: updated.attendedMinutes
  });
});

// ── Q&A ENDPOINTS ──

// GET /workshops/:id/qa - Get all questions
router.get("/workshops/:id/qa", requireAuth, async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const qa = await db.select()
    .from(workshopQaTable)
    .where(eq(workshopQaTable.workshopId, workshopId))
    .orderBy(sql`${workshopQaTable.isAnswered} ASC, ${workshopQaTable.votes} DESC, ${workshopQaTable.createdAt} DESC`);

  res.json(qa);
});

// POST /workshops/:id/qa - Submit a question
router.post("/workshops/:id/qa", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { question } = req.body;
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Question content is required" });
    return;
  }

  const user = req.user!;
  const [newQa] = await db.insert(workshopQaTable).values({
    workshopId,
    userId: user.id,
    userName: user.name,
    question: question.trim(),
    votes: 0,
    isAnswered: 0
  }).returning();

  res.status(201).json(newQa);
});

// POST /workshops/:id/qa/:qaId/vote - Vote/Upvote a question
router.post("/workshops/:id/qa/:qaId/vote", requireAuth, async (req, res): Promise<void> => {
  const qaId = parseInt(req.params.qaId as string, 10);
  if (isNaN(qaId)) { res.status(400).json({ error: "Invalid qaId" }); return; }

  const [qa] = await db.select().from(workshopQaTable).where(eq(workshopQaTable.id, qaId));
  if (!qa) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const [updated] = await db.update(workshopQaTable)
    .set({ votes: (qa.votes || 0) + 1 })
    .where(eq(workshopQaTable.id, qaId))
    .returning();

  res.json(updated);
});

// PATCH /workshops/:id/qa/:qaId/answer - Toggle question as answered (Moderator only)
router.patch("/workshops/:id/qa/:qaId/answer", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const qaId = parseInt(req.params.qaId as string, 10);
  if (isNaN(qaId)) { res.status(400).json({ error: "Invalid qaId" }); return; }

  const [updated] = await db.update(workshopQaTable)
    .set({ isAnswered: 1 })
    .where(eq(workshopQaTable.id, qaId))
    .returning();

  res.json(updated);
});

// ── POLLS ENDPOINTS ──

// GET /workshops/:id/polls - Get all polls with vote aggregates
router.get("/workshops/:id/polls", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = req.user!;
  const polls = await db.select().from(workshopPollsTable).where(eq(workshopPollsTable.workshopId, workshopId));

  // Fetch ALL votes once (not N+1) and group in memory
  const allVotes = await db.select().from(workshopPollVotesTable);
  const votesByPoll = new Map<number, typeof allVotes>();
  for (const v of allVotes) {
    if (!votesByPoll.has(v.pollId)) votesByPoll.set(v.pollId, []);
    votesByPoll.get(v.pollId)!.push(v);
  }

  const resultList = [];
  for (const p of polls) {
    const votes = votesByPoll.get(p.id) || [];
    
    // Aggregate votes per option
    const voteCounts = new Array(p.options.length).fill(0);
    votes.forEach(v => {
      if (v.optionIndex >= 0 && v.optionIndex < voteCounts.length) {
        voteCounts[v.optionIndex]++;
      }
    });

    const userVoted = votes.find(v => v.userId === user.id);

    resultList.push({
      ...p,
      voteCounts,
      totalVotes: votes.length,
      userVotedOption: userVoted ? userVoted.optionIndex : null
    });
  }

  res.json(resultList.reverse()); // latest first
});

// POST /workshops/:id/polls - Create a new poll (Moderator only)
router.post("/workshops/:id/polls", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { question, options } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: "Question and at least 2 options are required" });
    return;
  }

  const [poll] = await db.insert(workshopPollsTable).values({
    workshopId,
    question,
    options: options.map(o => String(o).trim()),
    isClosed: 0
  }).returning();

  await logAuditEvent({ action: "poll_create", userId: req.user!.id, targetType: "poll", targetId: poll.id, details: { question }, req });
  res.status(201).json(poll);
});

// POST /workshops/:id/polls/:pollId/vote - Vote on a poll
router.post("/workshops/:id/polls/:pollId/vote", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const pollId = parseInt(req.params.pollId as string, 10);
  if (isNaN(pollId)) { res.status(400).json({ error: "Invalid pollId" }); return; }

  const { optionIndex } = req.body;
  if (optionIndex === undefined || isNaN(Number(optionIndex))) {
    res.status(400).json({ error: "optionIndex is required" });
    return;
  }

  const user = req.user!;

  // Check if poll exists and is open
  const [poll] = await db.select().from(workshopPollsTable).where(eq(workshopPollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.isClosed === 1) { res.status(400).json({ error: "This poll is closed / هذا الاستطلاع مغلق" }); return; }

  // Check if already voted
  const [existing] = await db.select()
    .from(workshopPollVotesTable)
    .where(and(eq(workshopPollVotesTable.pollId, pollId), eq(workshopPollVotesTable.userId, user.id)));

  if (existing) {
    res.status(400).json({ error: "You have already voted on this poll / لقد قمت بالتصويت بالفعل في هذا الاستطلاع" });
    return;
  }

  await db.insert(workshopPollVotesTable).values({
    pollId,
    userId: user.id,
    optionIndex: Number(optionIndex)
  });

  res.json({ success: true });
});

// PATCH /workshops/:id/polls/:pollId/close - Close a poll (Moderator only)
router.patch("/workshops/:id/polls/:pollId/close", requireAuth, requireRole(["admin", "instructor"]), async (req, res): Promise<void> => {
  const pollId = parseInt(req.params.pollId as string, 10);
  if (isNaN(pollId)) { res.status(400).json({ error: "Invalid pollId" }); return; }

  const [poll] = await db.update(workshopPollsTable)
    .set({ isClosed: 1 })
    .where(eq(workshopPollsTable.id, pollId))
    .returning();

  res.json(poll);
});

// ── SHARED NOTES ENDPOINTS ──

// GET /workshops/:id/notes - Get shared notes
router.get("/workshops/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [notes] = await db.select().from(workshopNotesTable).where(eq(workshopNotesTable.workshopId, workshopId));

  if (!notes) {
    const [newNotes] = await db.insert(workshopNotesTable).values({
      workshopId,
      content: ""
    }).returning();
    res.json(newNotes);
  } else {
    res.json(notes);
  }
});

// POST /workshops/:id/notes - Update shared notes
router.post("/workshops/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body;
  const contentStr = content !== undefined ? String(content) : "";

  const [notes] = await db.select().from(workshopNotesTable).where(eq(workshopNotesTable.workshopId, workshopId));

  if (notes) {
    const [updated] = await db.update(workshopNotesTable)
      .set({ content: contentStr, updatedAt: new Date() })
      .where(eq(workshopNotesTable.workshopId, workshopId))
      .returning();
    res.json(updated);
  } else {
    const [inserted] = await db.insert(workshopNotesTable)
      .values({
        workshopId,
        content: contentStr
      }).returning();
    res.json(inserted);
  }
});

// POST /workshops/:id/subscribe - Subscribe to start notifications (Pre-register)
router.post("/workshops/:id/subscribe", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = req.user!;
  
  // Check if already subscribed
  const [existing] = await db.select()
    .from(workshopSubscriptionsTable)
    .where(and(eq(workshopSubscriptionsTable.workshopId, workshopId), eq(workshopSubscriptionsTable.userId, user.id)));

  if (!existing) {
    await db.insert(workshopSubscriptionsTable).values({
      workshopId,
      userId: user.id
    });
  }

  res.json({ success: true });
});

// GET /workshops/my-subscriptions - Get list of subscribed workshop ids for current user
router.get("/workshops/my-subscriptions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const subs = await db.select()
    .from(workshopSubscriptionsTable)
    .where(eq(workshopSubscriptionsTable.userId, user.id));
  
  res.json(subs.map(s => s.workshopId));
});

// GET /workshops/active-notifications - Fetch ongoing workshops that the user has subscribed to
router.get("/workshops/active-notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  
  // Fetch workshops marked ongoing with active room urls
  const ongoing = await db.select()
    .from(workshopsTable)
    .where(eq(workshopsTable.status, "ongoing"));
  
  const activeStreams = ongoing.filter(w => w.dailyRoomUrl && w.dailyRoomUrl.trim() !== "");

  if (activeStreams.length === 0) {
    res.json([]);
    return;
  }

  // Get user subscriptions
  const subs = await db.select()
    .from(workshopSubscriptionsTable)
    .where(eq(workshopSubscriptionsTable.userId, user.id));
  
  const subIds = new Set(subs.map(s => s.workshopId));

  // Filter only those active streams the user is subscribed to
  const matches = activeStreams.filter(w => subIds.has(w.id));

  res.json(matches.map(w => ({
    id: w.id,
    title: w.title,
    instructor: w.instructor,
    dailyRoomUrl: w.dailyRoomUrl
  })));
});

// POST /workshops/:id/end-stream - End stream permanently (Moderator only)
router.post("/workshops/:id/end-stream", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const workshopId = parseInt(req.params.id as string, 10);
  if (isNaN(workshopId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = req.user!;
  const isPrivileged = user.role === "admin" || user.role === "instructor";
  if (!isPrivileged) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    // 1. Fetch workshop details
    const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, workshopId));
    if (!w) {
      res.status(404).json({ error: "Workshop not found" });
      return;
    }

    // 2. Set isClosed: 1 and clear stream info
    await db.update(workshopsTable)
      .set({
        isClosed: 1,
        dailyRoomUrl: null,
        dailyRoomName: null
      })
      .where(eq(workshopsTable.id, workshopId));

    // 3. Delete Daily.co room if it exists (via API)
    if (w.dailyRoomName && process.env.DAILY_API_KEY) {
      try {
        await fetch(`https://api.daily.co/v1/rooms/${w.dailyRoomName}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${process.env.DAILY_API_KEY}`
          }
        });
      } catch (delErr) {
        logger.error({ delErr }, "Failed to delete Daily room on stream end");
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to end stream" });
  }
});

export default router;
