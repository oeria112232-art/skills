import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createSuperAdmin() {
  const email = "super.admin.master.root.security@mharat.platform.com";
  const passwordRaw = "Mharat#SuperAdmin#MasterRoot$2026!SecuredSecurityPassKey#9982";
  const name = "المدير الرئيسي الأعلى / Super Admin Master Root Authority";

  console.log("Hashing password with bcrypt 10 rounds...");
  const passwordHash = bcrypt.hashSync(passwordRaw, 10);

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (existing.length > 0) {
    console.log("Updating existing Super Admin account...");
    await db.update(usersTable).set({
      name,
      passwordHash,
      role: "super_admin",
      points: 999999,
      streak: 100,
      allowedPages: ["*"],
    }).where(eq(usersTable.email, email));
    console.log("Super Admin account updated successfully!");
  } else {
    console.log("Inserting new Super Admin account...");
    const [user] = await db.insert(usersTable).values({
      name,
      email,
      passwordHash,
      role: "super_admin",
      points: 999999,
      streak: 100,
      allowedPages: ["*"],
    }).returning();
    console.log("Super Admin account created with ID:", user.id);
  }

  process.exit(0);
}

createSuperAdmin().catch((err) => {
  console.error("Error creating Super Admin:", err);
  process.exit(1);
});
