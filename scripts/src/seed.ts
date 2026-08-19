import { db } from "@workspace/db";
import { 
  usersTable 
} from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  // Safety check: prevent running on production database
  const dbUrl = process.env.DATABASE_URL || "";
  const isProduction = dbUrl.includes("production") || 
                        dbUrl.includes("amazonaws") || 
                        dbUrl.includes("neon") ||
                        dbUrl.includes("railway") ||
                        dbUrl.includes("render");
  
  if (isProduction) {
    console.error("ABORT: Refusing to run seed on production database.");
    console.error("DATABASE_URL appears to be a production connection string.");
    process.exit(1);
  }

  console.log("Cleaning and resetting database nodes...");

  // Clear all database tables completely
  await db.execute(
    sql`TRUNCATE users, jobs, screening_questions, applications, workshops, enrollments, exam_questions, certificates, tracks, track_modules, user_progress, mock_interview_sessions, mock_interview_messages, consultations, deposit_requests, points_transactions, platform_settings, discount_codes, payment_methods, audit_log, workshop_qa, workshop_polls, workshop_poll_votes, workshop_notes, workshop_subscriptions RESTART IDENTITY CASCADE`
  );

  console.log("Database cleared successfully.");

  // Hash passwords securely with bcrypt (cost factor 10)
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const studentPasswordHash = bcrypt.hashSync("pass123", 10);

  // Seed only the official test user accounts
  console.log("Seeding test user accounts...");
  await db.insert(usersTable).values([
    {
      id: 1,
      name: "أحمد الرشيدي / Ahmed Al-Rashidi",
      email: "admin@eduplatform.com",
      passwordHash: adminPasswordHash,
      role: "admin",
      points: 2450,
      streak: 14,
    },
    {
      id: 2,
      name: "طالب تجريبي / علي حسين",
      email: "student@eduplatform.com",
      passwordHash: studentPasswordHash,
      role: "student",
      points: 150,
      streak: 4,
    },
  ]);

  console.log("✓ Database reset. All tables cleared and re-seeded.");
  console.log("✓ Seed complete!");
  console.log("  Admin:    admin@eduplatform.com / admin123");
  console.log("  Student:  student@eduplatform.com / pass123");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
