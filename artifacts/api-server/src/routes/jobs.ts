import { Router } from "express";
import { db, jobsTable, screeningQuestionsTable, applicationsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  ListJobsQueryParams, CreateJobBody, GetJobParams,
  UpdateJobParams, UpdateJobBody, DeleteJobParams,
  GetJobScreeningQuestionsParams, AddJobScreeningQuestionParams, AddJobScreeningQuestionBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/jobs", async (req, res): Promise<void> => {
  const parsed = ListJobsQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data : {};

  let conditions: ReturnType<typeof eq>[] = [];
  if (q.type) conditions.push(eq(jobsTable.type, q.type));
  if (q.level) conditions.push(eq(jobsTable.level, q.level));
  if (q.remote === "true") conditions.push(eq(jobsTable.isRemote, true));

  const jobs = conditions.length > 0
    ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(jobsTable.createdAt)
    : await db.select().from(jobsTable).orderBy(jobsTable.createdAt);

  const filtered = q.search
    ? jobs.filter(j => j.title.toLowerCase().includes(q.search!.toLowerCase()) || j.company.toLowerCase().includes(q.search!.toLowerCase()))
    : jobs;

  res.json(filtered.map(j => ({
    ...j,
    isRemote: Boolean(j.isRemote),
    createdAt: j.createdAt.toISOString(),
  })));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.insert(jobsTable).values(parsed.data).returning();
  res.status(201).json({ ...job, isRemote: Boolean(job.isRemote), createdAt: job.createdAt.toISOString() });
});

router.get("/jobs/stats", async (_req, res): Promise<void> => {
  const [{ count: totalJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable);
  const [{ count: openJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "open"));
  const [{ count: totalApplications }] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable);
  const [{ count: filledPositions }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "filled"));
  res.json({
    totalJobs: Number(totalJobs),
    openJobs: Number(openJobs),
    totalApplications: Number(totalApplications),
    filledPositions: Number(filledPositions),
  });
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({ ...job, isRemote: Boolean(job.isRemote), createdAt: job.createdAt.toISOString() });
});

router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [job] = await db.update(jobsTable).set(parsed.data).where(eq(jobsTable.id, params.data.id)).returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({ ...job, isRemote: Boolean(job.isRemote), createdAt: job.createdAt.toISOString() });
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/jobs/:id/screening-questions", async (req, res): Promise<void> => {
  const params = GetJobScreeningQuestionsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const questions = await db.select().from(screeningQuestionsTable)
    .where(eq(screeningQuestionsTable.jobId, params.data.id))
    .orderBy(screeningQuestionsTable.order);
  res.json(questions);
});

router.post("/jobs/:id/screening-questions", async (req, res): Promise<void> => {
  const params = AddJobScreeningQuestionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = AddJobScreeningQuestionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [q] = await db.insert(screeningQuestionsTable).values({
    jobId: params.data.id, ...parsed.data, order: parsed.data.order ?? 0,
  }).returning();
  res.status(201).json(q);
});

export default router;
