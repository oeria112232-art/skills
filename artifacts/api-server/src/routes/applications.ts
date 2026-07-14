import { Router } from "express";
import { db, applicationsTable, jobsTable, screeningQuestionsTable, usersTable, certificatesTable, tracksTable, userProgressTable, enrollmentsTable, workshopsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListApplicationsQueryParams, CreateApplicationBody,
  GetApplicationParams, UpdateApplicationStatusParams, UpdateApplicationStatusBody,
  SubmitScreeningParams, SubmitScreeningBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { logAuditEvent } from "../services/audit-log";

const router = Router();

async function getCvSnapshot(userId: number, existingSnapshot: any): Promise<any> {
  if (existingSnapshot && Object.keys(existingSnapshot).length > 0 && (existingSnapshot.summary || (existingSnapshot.experience && existingSnapshot.experience.length > 0))) {
    return existingSnapshot;
  }
  
  // Fallback: compile from user's current profile
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.cv || (!(user.cv as any).summary && (!(user.cv as any).experience || (user.cv as any).experience.length === 0))) {
    return existingSnapshot || null;
  }

  const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, user.id));
  const allTracks = await db.select().from(tracksTable);
  const userProgress = await db.select().from(userProgressTable).where(eq(userProgressTable.userId, user.id));
  const tracksSnapshot = allTracks.map(t => {
    const trackProgress = userProgress.filter(p => p.trackId === t.id);
    const completedModules = trackProgress.filter(p => p.completed === 1);
    const percent = t.moduleCount > 0 ? Math.round((completedModules.length / t.moduleCount) * 100) : 0;
    return {
      title: t.title,
      percentComplete: percent,
      points: completedModules.length * 10,
      isEnrolled: trackProgress.length > 0
    };
  }).filter(t => t.isEnrolled);

  const userEnrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, user.id));
  const allWorkshops = await db.select().from(workshopsTable);
  const workshopsSnapshot = userEnrollments.map(e => {
    const w = allWorkshops.find(ws => ws.id === e.workshopId);
    return w ? { title: w.title } : null;
  }).filter(Boolean);

  const snapshot = {
    ...(user.cv as any || {}),
    certificates: certs.map(c => ({
      id: c.id,
      workshopTitle: c.workshopTitle,
      certificateNumber: c.certificateNumber,
      verificationCode: c.verificationCode,
      issuedAt: c.issuedAt
    })),
    tracks: tracksSnapshot,
    workshops: workshopsSnapshot
  };

  return JSON.parse(JSON.stringify(snapshot, (k, v) => v === undefined ? null : v));
}

async function getContactInfoSnapshot(userId: number, existingSnapshot: any): Promise<any> {
  if (existingSnapshot && Object.keys(existingSnapshot).length > 0) {
    return existingSnapshot;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ? user.contactInfo : null;
}

import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

router.get("/applications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = ListApplicationsQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data : {};

  const allApps = await db.select().from(applicationsTable);
  const allJobs = await db.select().from(jobsTable);

  const apps = allApps.map(app => {
    const job = allJobs.find(j => j.id === app.jobId);
    return {
      app,
      jobTitle: job ? job.title : null,
      companyId: job ? job.companyId : null,
    };
  });

  const user = req.user!;
  const filteredApps = apps
    .filter(a => !q.jobId || a.app.jobId === q.jobId)
    .filter(a => !q.status || a.app.status === q.status)
    .filter(a => !q.userId || a.app.userId === q.userId)
    .filter(a => !q.companyId || a.companyId === q.companyId)
    .filter(a => {
      if (user.role === "admin") return true;
      if (user.role === "company") return a.companyId === user.id;
      if (user.role === "student") return a.app.userId === user.id;
      return false;
    });

  const resolved = await Promise.all(filteredApps.map(async a => {
    const cvSnapshot = await getCvSnapshot(a.app.userId || 0, a.app.cvSnapshot);
    const contactInfoSnapshot = await getContactInfoSnapshot(a.app.userId || 0, a.app.contactInfoSnapshot);
    return {
      ...a.app,
      cvSnapshot,
      contactInfoSnapshot,
      jobTitle: a.jobTitle,
      createdAt: a.app.createdAt.toISOString(),
    };
  }));

  res.json(resolved);
});

router.post("/applications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  
  const user = req.user!;
  const userId = user.role === "admin" ? (parsed.data.userId || user.id) : user.id;
  
  let cvSnapshot = null;
  let contactInfoSnapshot = null;
  const [appUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (appUser) {
    const certs = await db.select().from(certificatesTable).where(eq(certificatesTable.userId, appUser.id));
    const allTracks = await db.select().from(tracksTable);
    const userProgress = await db.select().from(userProgressTable).where(eq(userProgressTable.userId, appUser.id));
    const tracksSnapshot = allTracks.map(t => {
      const trackProgress = userProgress.filter(p => p.trackId === t.id);
      const completedModules = trackProgress.filter(p => p.completed === 1);
      const percent = t.moduleCount > 0 ? Math.round((completedModules.length / t.moduleCount) * 100) : 0;
      return {
        title: t.title,
        percentComplete: percent,
        points: completedModules.length * 10,
        isEnrolled: trackProgress.length > 0
      };
    }).filter(t => t.isEnrolled);

    const userEnrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, appUser.id));
    const allWorkshops = await db.select().from(workshopsTable);
    const workshopsSnapshot = userEnrollments.map(e => {
      const w = allWorkshops.find(ws => ws.id === e.workshopId);
      return w ? { title: w.title } : null;
    }).filter(Boolean);

    cvSnapshot = {
      ...(appUser.cv as any || {}),
      certificates: certs.map(c => ({
        id: c.id,
        workshopTitle: c.workshopTitle,
        certificateNumber: c.certificateNumber,
        verificationCode: c.verificationCode,
        issuedAt: c.issuedAt
      })),
      tracks: tracksSnapshot,
      workshops: workshopsSnapshot
    };
    contactInfoSnapshot = appUser.contactInfo;
  }

  const cleanCvSnapshot = cvSnapshot ? JSON.parse(JSON.stringify(cvSnapshot, (k, v) => v === undefined ? null : v)) : null;
  const cleanContactInfoSnapshot = contactInfoSnapshot ? JSON.parse(JSON.stringify(contactInfoSnapshot, (k, v) => v === undefined ? null : v)) : null;

  const [app] = await db.insert(applicationsTable).values({
    ...parsed.data,
    userId,
    cvSnapshot: cleanCvSnapshot,
    contactInfoSnapshot: cleanContactInfoSnapshot
  }).returning();
  
  await db.update(jobsTable)
    .set({ applicationCount: sql`${jobsTable.applicationCount} + 1` })
    .where(eq(jobsTable.id, parsed.data.jobId));

  res.status(201).json({ ...app, jobTitle: null, createdAt: app.createdAt.toISOString() });
});

router.get("/applications/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  const user = req.user!;
  
  if (user.role !== "admin" && app.userId !== user.id && (!job || job.companyId !== user.id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cvSnapshot = await getCvSnapshot(app.userId || 0, app.cvSnapshot);
  const contactInfoSnapshot = await getContactInfoSnapshot(app.userId || 0, app.contactInfoSnapshot);

  res.json({ 
    ...app, 
    cvSnapshot,
    contactInfoSnapshot,
    jobTitle: job ? job.title : null, 
    createdAt: app.createdAt.toISOString() 
  });
});

router.patch("/applications/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateApplicationStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existingApp] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!existingApp) { res.status(404).json({ error: "Application not found" }); return; }
  
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, existingApp.jobId));
  const user = req.user!;
  
  const isSelf = existingApp.userId === user.id;
  const isJobOwner = job && job.companyId === user.id;
  const isAdmin = user.role === "admin";
  
  if (!isAdmin && !isSelf && !isJobOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  
  const updateData: any = {};
  if (typeof req.body.status === "string") {
    if (isAdmin || isJobOwner || (isSelf && req.body.status === "pending")) {
      updateData.status = req.body.status;
    } else {
      res.status(403).json({ error: "Forbidden status change" });
      return;
    }
  }
  if (typeof req.body.coverLetter === "string") {
    if (isAdmin || isSelf) {
      updateData.coverLetter = req.body.coverLetter;
    } else {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const [app] = await db.update(applicationsTable)
    .set(updateData)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();
  
  await logAuditEvent({ action: "application_update", userId: req.user!.id, targetType: "application", targetId: params.data.id, details: { fields: Object.keys(updateData) }, req });
  res.json({ ...app, jobTitle: null, createdAt: app.createdAt.toISOString() });
});

router.post("/applications/:id/screening", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = SubmitScreeningParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

  const user = req.user!;
  if (user.role !== "admin" && app.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = SubmitScreeningBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const questions = await db.select().from(screeningQuestionsTable)
    .where(eq(screeningQuestionsTable.jobId, app.jobId))
    .orderBy(screeningQuestionsTable.order);

  const answers = parsed.data.answers;
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correctIndex) correct++;
  }
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= job.passScore;

  await db.update(applicationsTable)
    .set({ screeningScore: score, screeningPassed: passed, status: passed ? "screening_passed" : "screening_failed" })
    .where(eq(applicationsTable.id, params.data.id));

  res.json({
    score, passed, total,
    message: passed
      ? `Congratulations! You scored ${score}% and passed the screening test.`
      : `You scored ${score}%. The minimum passing score is ${job.passScore}%.`,
  });
});

export default router;


