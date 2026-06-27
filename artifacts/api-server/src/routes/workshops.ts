import { Router } from "express";
import { db, workshopsTable, enrollmentsTable, examQuestionsTable, certificatesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  ListWorkshopsQueryParams, CreateWorkshopBody,
  GetWorkshopParams, UpdateWorkshopParams, UpdateWorkshopBody, DeleteWorkshopParams,
  EnrollWorkshopParams, EnrollWorkshopBody, ListWorkshopEnrollmentsParams,
  GetWorkshopExamParams, AddExamQuestionParams, AddExamQuestionBody,
  SubmitExamParams, SubmitExamBody,
} from "@workspace/api-zod";

const router = Router();

function serializeWorkshop(w: typeof workshopsTable.$inferSelect) {
  return {
    ...w,
    tags: w.tags ?? [],
    enrolledCount: w.enrolledCount,
    createdAt: w.createdAt.toISOString(),
  };
}

router.get("/workshops", async (req, res): Promise<void> => {
  const parsed = ListWorkshopsQueryParams.safeParse(req.query);
  const q = parsed.success ? parsed.data : {};
  const workshops = q.status
    ? await db.select().from(workshopsTable).where(eq(workshopsTable.status, q.status)).orderBy(workshopsTable.date)
    : await db.select().from(workshopsTable).orderBy(workshopsTable.date);
  res.json(workshops.map(serializeWorkshop));
});

router.post("/workshops", async (req, res): Promise<void> => {
  const parsed = CreateWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [w] = await db.insert(workshopsTable).values({ ...parsed.data, tags: parsed.data.tags ?? [] }).returning();
  res.status(201).json(serializeWorkshop(w));
});

router.get("/workshops/:id", async (req, res): Promise<void> => {
  const params = GetWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!w) { res.status(404).json({ error: "Workshop not found" }); return; }
  res.json(serializeWorkshop(w));
});

router.patch("/workshops/:id", async (req, res): Promise<void> => {
  const params = UpdateWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [w] = await db.update(workshopsTable).set(parsed.data).where(eq(workshopsTable.id, params.data.id)).returning();
  if (!w) { res.status(404).json({ error: "Workshop not found" }); return; }
  res.json(serializeWorkshop(w));
});

router.delete("/workshops/:id", async (req, res): Promise<void> => {
  const params = DeleteWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/workshops/:id/enroll", async (req, res): Promise<void> => {
  const params = EnrollWorkshopParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = EnrollWorkshopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [enrollment] = await db.insert(enrollmentsTable).values({
    workshopId: params.data.id,
    userId: parsed.data.userId,
    userName: parsed.data.userName,
    userEmail: parsed.data.userEmail,
  }).returning();
  await db.update(workshopsTable)
    .set({ enrolledCount: sql`${workshopsTable.enrolledCount} + 1` })
    .where(eq(workshopsTable.id, params.data.id));
  res.status(201).json({ ...enrollment, createdAt: enrollment.createdAt.toISOString() });
});

router.get("/workshops/:id/enrollments", async (req, res): Promise<void> => {
  const params = ListWorkshopEnrollmentsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.workshopId, params.data.id));
  res.json(enrollments.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

router.get("/workshops/:id/exam", async (req, res): Promise<void> => {
  const params = GetWorkshopExamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
  const questions = await db.select().from(examQuestionsTable)
    .where(eq(examQuestionsTable.workshopId, params.data.id))
    .orderBy(examQuestionsTable.order);
  res.json({
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    passScore: workshop.passScore,
    timeLimitMinutes: workshop.timeLimitMinutes,
    questions: questions.map(q => ({
      id: q.id, workshopId: q.workshopId, question: q.question,
      options: q.options, order: q.order,
    })),
  });
});

router.post("/workshops/:id/exam", async (req, res): Promise<void> => {
  const params = AddExamQuestionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = AddExamQuestionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [q] = await db.insert(examQuestionsTable).values({
    workshopId: params.data.id, ...parsed.data, order: parsed.data.order ?? 0,
  }).returning();
  res.status(201).json({ id: q.id, workshopId: q.workshopId, question: q.question, options: q.options, order: q.order });
});

router.post("/workshops/:id/exam/submit", async (req, res): Promise<void> => {
  const params = SubmitExamParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SubmitExamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, params.data.id));
  if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }

  const questions = await db.select().from(examQuestionsTable)
    .where(eq(examQuestionsTable.workshopId, params.data.id))
    .orderBy(examQuestionsTable.order);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
  const answers = parsed.data.answers;
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correctIndex) correct++;
  }
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= workshop.passScore;

  let certificateId: number | null = null;
  if (passed && user) {
    const certNumber = `CERT-${workshop.id}-${user.id}-${Date.now()}`;
    const [cert] = await db.insert(certificatesTable).values({
      userId: user.id,
      userName: user.name,
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      score,
      certificateNumber: certNumber,
    }).returning();
    certificateId = cert.id;
    // award points
    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 100` })
      .where(eq(usersTable.id, user.id));
  }

  res.json({
    score, passed, total, certificateIssued: passed && !!user,
    certificateId,
    message: passed
      ? `Excellent! You scored ${score}% and earned your certificate!`
      : `You scored ${score}%. Minimum passing score is ${workshop.passScore}%.`,
  });
});

export default router;
