import { Router } from "express";
import { db, usersTable, jobsTable, applicationsTable, workshopsTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [{ count: studentsTrained }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student"));
  const [{ count: certificatesIssued }] = await db.select({ count: sql<number>`count(*)` }).from(certificatesTable);
  const [{ count: jobsFilled }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "filled"));
  const [{ count: workshopsHeld }] = await db.select({ count: sql<number>`count(*)` }).from(workshopsTable).where(eq(workshopsTable.status, "completed"));
  const [{ count: activeJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "open"));
  res.json({
    studentsTrained: Number(studentsTrained),
    certificatesIssued: Number(certificatesIssued),
    jobsFilled: Number(jobsFilled),
    workshopsHeld: Number(workshopsHeld),
    activeJobs: Number(activeJobs),
  });
});

router.get("/stats/admin", async (_req, res): Promise<void> => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: totalJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable);
  const [{ count: openJobs }] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "open"));
  const [{ count: totalApplications }] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable);
  const [{ count: pendingApplications }] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(eq(applicationsTable.status, "pending"));
  const [{ count: totalWorkshops }] = await db.select({ count: sql<number>`count(*)` }).from(workshopsTable);
  const [{ count: upcomingWorkshops }] = await db.select({ count: sql<number>`count(*)` }).from(workshopsTable).where(eq(workshopsTable.status, "upcoming"));
  const [{ count: totalCertificates }] = await db.select({ count: sql<number>`count(*)` }).from(certificatesTable);

  const recentApplications = await db.select({
    app: applicationsTable,
    jobTitle: jobsTable.title,
  }).from(applicationsTable)
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
    recentApplications: recentApplications.map(r => ({
      ...r.app, jobTitle: r.jobTitle, createdAt: r.app.createdAt.toISOString(),
    })),
  });
});

export default router;
