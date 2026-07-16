import { Router } from "express";
import { db, usersTable, jobsTable, applicationsTable, workshopsTable, certificatesTable, enrollmentsTable, platformSettingsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  try {
    const enrolls = await db.select().from(enrollmentsTable);
    const uniqueStudents = new Set(enrolls.map(e => e.userId));
    const studentsTrained = uniqueStudents.size;

    const certs = await db.select().from(certificatesTable);
    const certificatesIssued = certs.filter(c => c.status === "issued").length;

    const apps = await db.select().from(applicationsTable);
    const jobsFilled = apps.filter(a => a.status === "accepted").length;

    const jobs = await db.select().from(jobsTable);
    const activeJobs = jobs.filter(j => j.status === "open").length;

    const workshops = await db.select().from(workshopsTable);
    const workshopsHeld = workshops.filter(w => w.status === "completed").length;

    res.json({
      studentsTrained,
      certificatesIssued,
      jobsFilled,
      workshopsHeld,
      activeJobs,
    });
  } catch (err) {
    res.json({
      studentsTrained: 0,
      certificatesIssued: 0,
      jobsFilled: 0,
      workshopsHeld: 0,
      activeJobs: 0,
    });
  }
});

router.get("/stats/admin", requireAuth, requireRole(["admin", "instructor"]), async (_req, res): Promise<void> => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: totalJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable);
  const [{ count: openJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "open"));
  const [{ count: totalApplications }] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable);
  const [{ count: pendingApplications }] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(eq(applicationsTable.status, "pending"));
  const [{ count: totalWorkshops }] = await db.select({ count: sql<number>`count(*)` }).from(workshopsTable);
  const [{ count: upcomingWorkshops }] = await db.select({ count: sql<number>`count(*)` }).from(workshopsTable).where(eq(workshopsTable.status, "upcoming"));
  const [{ count: totalCertificates }] = await db.select({ count: sql<number>`count(*)` }).from(certificatesTable);

  const recentAppsMerged = await db.select({
    id: applicationsTable.id,
    userId: applicationsTable.userId,
    jobId: applicationsTable.jobId,
    status: applicationsTable.status,
    createdAt: applicationsTable.createdAt,
    jobTitle: jobsTable.title,
  })
  .from(applicationsTable)
  .leftJoin(jobsTable, eq(applicationsTable.jobId, jobsTable.id))
  .orderBy(desc(applicationsTable.createdAt))
  .limit(5);

  res.json({
    totalUsers: Number(totalUsers),
    totalJobs: Number(totalJobs),
    openJobs: Number(openJobs),
    totalApplications: Number(totalApplications),
    pendingApplications: Number(pendingApplications),
    totalWorkshops: Number(totalWorkshops),
    upcomingWorkshops: Number(upcomingWorkshops),
    totalCertificates: Number(totalCertificates),
    recentApplications: recentAppsMerged.map(app => ({
      ...app, createdAt: app.createdAt.toISOString()
    })),
  });
});

export default router;
