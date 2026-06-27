import { Router } from "express";
import { db, applicationsTable, jobsTable, screeningQuestionsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListApplicationsQueryParams, CreateApplicationBody,
  GetApplicationParams, UpdateApplicationStatusParams, UpdateApplicationStatusBody,
  SubmitScreeningParams, SubmitScreeningBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/applications", async (req, res): Promise<void> => {
  const parsed = ListApplicationsQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data : {};

  const apps = await db.select({
    app: applicationsTable,
    jobTitle: jobsTable.title,
  }).from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id));

  const filtered = apps
    .filter(a => !q.jobId || a.app.jobId === q.jobId)
    .filter(a => !q.status || a.app.status === q.status)
    .map(a => ({
      ...a.app,
      jobTitle: a.jobTitle,
      createdAt: a.app.createdAt.toISOString(),
    }));

  res.json(filtered);
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db.insert(applicationsTable).values(parsed.data).returning();
  // increment application count
  await db.update(jobsTable)
    .set({ applicationCount: sql`${jobsTable.applicationCount} + 1` })
    .where(eq(jobsTable.id, parsed.data.jobId));

  res.status(201).json({ ...app, jobTitle: null, createdAt: app.createdAt.toISOString() });
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [result] = await db.select({ app: applicationsTable, jobTitle: jobsTable.title })
    .from(applicationsTable)
    .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
    .where(eq(applicationsTable.id, params.data.id));
  if (!result) { res.status(404).json({ error: "Application not found" }); return; }
  res.json({ ...result.app, jobTitle: result.jobTitle, createdAt: result.app.createdAt.toISOString() });
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const params = UpdateApplicationStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [app] = await db.update(applicationsTable)
    .set({ status: parsed.data.status })
    .where(eq(applicationsTable.id, params.data.id))
    .returning();
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }
  res.json({ ...app, jobTitle: null, createdAt: app.createdAt.toISOString() });
});

router.post("/applications/:id/screening", async (req, res): Promise<void> => {
  const params = SubmitScreeningParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SubmitScreeningBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!app) { res.status(404).json({ error: "Application not found" }); return; }

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
