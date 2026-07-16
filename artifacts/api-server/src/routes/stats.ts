import { Router } from "express";
import { db, usersTable, jobsTable, applicationsTable, workshopsTable, certificatesTable, platformSettingsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  try {
    const settings = await db.select().from(platformSettingsTable);
    const getSettingVal = (key: string, fallback: number) => {
      const s = settings.find(x => x.key === key);
      return s ? Number(s.value) : fallback;
    };

    const studentsTrained = getSettingVal("stats_students_trained", 12840);
    const certificatesIssued = getSettingVal("stats_certificates_issued", 5230);
    const jobsFilled = getSettingVal("stats_jobs_filled", 1890);
    const activeJobs = getSettingVal("stats_active_jobs", 340);
    const workshopsHeld = getSettingVal("stats_workshops_held", 150);

    res.json({
      studentsTrained,
      certificatesIssued,
      jobsFilled,
      workshopsHeld,
      activeJobs,
    });
  } catch (err) {
    res.json({
      studentsTrained: 12840,
      certificatesIssued: 5230,
      jobsFilled: 1890,
      workshopsHeld: 150,
      activeJobs: 340,
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
