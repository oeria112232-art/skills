import { Router } from "express";
import { db, usersTable, jobsTable, applicationsTable, workshopsTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const studentsTrained = (await db.select().from(usersTable).where(eq(usersTable.role, "student"))).length;
  const certificatesIssued = (await db.select().from(certificatesTable)).length;
  const jobsFilled = (await db.select().from(jobsTable).where(eq(jobsTable.status, "filled"))).length;
  const workshopsHeld = (await db.select().from(workshopsTable).where(eq(workshopsTable.status, "completed"))).length;
  const activeJobs = (await db.select().from(jobsTable).where(eq(jobsTable.status, "open"))).length;
  res.json({
    studentsTrained,
    certificatesIssued,
    jobsFilled,
    workshopsHeld,
    activeJobs,
  });
});

router.get("/stats/admin", requireAuth, requireRole(["admin", "instructor"]), async (_req, res): Promise<void> => {
  const totalUsers = (await db.select().from(usersTable)).length;
  const totalJobs = (await db.select().from(jobsTable)).length;
  const openJobs = (await db.select().from(jobsTable).where(eq(jobsTable.status, "open"))).length;
  const totalApplications = (await db.select().from(applicationsTable)).length;
  const pendingApplications = (await db.select().from(applicationsTable).where(eq(applicationsTable.status, "pending"))).length;
  const totalWorkshops = (await db.select().from(workshopsTable)).length;
  const upcomingWorkshops = (await db.select().from(workshopsTable).where(eq(workshopsTable.status, "upcoming"))).length;
  const totalCertificates = (await db.select().from(certificatesTable)).length;

  const allApps = await db.select().from(applicationsTable).orderBy(desc(applicationsTable.createdAt));
  const allJobs = await db.select().from(jobsTable);
  const recentAppsMerged = allApps.slice(0, 5).map(app => {
    const job = allJobs.find(j => j.id === app.jobId);
    return {
      ...app,
      jobTitle: job ? job.title : null
    };
  });

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
