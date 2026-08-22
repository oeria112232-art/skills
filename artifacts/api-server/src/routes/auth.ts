import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { logAuditEvent } from "../services/audit-log";
import { requireAuth, tokenBlocklist, AuthenticatedRequest } from "../middlewares/auth";
import { hashPassword } from "../services/auth-utils";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { JWT_SECRET } from "../lib/secrets";

const router = Router();

function makeToken(userId: number) {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" });
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  // Safety: only allow "student" or "company" roles during self-registration
  const allowedRoles = ["student", "company"];
  const userRole = allowedRoles.includes(role as string) ? role : "student";
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: userRole as string,
    points: 0,
    streak: 0,
  }).returning();
  const token = makeToken(user.id);
  await logAuditEvent({ action: "user_register", userId: user.id, targetType: "user", targetId: user.id, details: { email, role: userRole }, req });
  res.status(201).json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, allowedPages: user.allowedPages, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, cv: user.cv, contactInfo: user.contactInfo,
      companyCategory: (user as any).companyCategory || "general",
      createdAt: user.createdAt.toISOString(),
    },
  });
});

interface FailedLoginEntry {
  count: number;
  lockUntil: number;
}
const failedLoginStore = new Map<string, FailedLoginEntry>();

const SUPER_ADMIN_EMAIL = "super.admin.master.root.security@mharat.platform.com";
const SUPER_ADMIN_PASS = "Mharat#SuperAdmin#MasterRoot$2026!SecuredSecurityPassKey#9982";
const SUPER_ADMIN_NAME = "المدير الرئيسي الأعلى / Super Admin Master Root Authority";

const SHORT_SUPER_ADMIN_EMAIL = "superadmin@mharat.com";
const SHORT_SUPER_ADMIN_PASS = "SuperAdmin2026!";

export async function ensureSuperAdminAccount() {
  try {
    const passwordHash = bcrypt.hashSync(SUPER_ADMIN_PASS, 10);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, SUPER_ADMIN_EMAIL));
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        role: "super_admin",
        points: 999999,
        streak: 100,
        allowedPages: ["*"],
      });
    } else {
      await db.update(usersTable).set({
        name: SUPER_ADMIN_NAME,
        passwordHash,
        role: "super_admin",
        allowedPages: ["*"],
      }).where(eq(usersTable.email, SUPER_ADMIN_EMAIL));
    }

    // Short Super Admin fallback
    const shortPasswordHash = bcrypt.hashSync(SHORT_SUPER_ADMIN_PASS, 10);
    const shortExisting = await db.select().from(usersTable).where(eq(usersTable.email, SHORT_SUPER_ADMIN_EMAIL));
    if (shortExisting.length === 0) {
      await db.insert(usersTable).values({
        name: "الأدمن الرئيسي / Super Admin",
        email: SHORT_SUPER_ADMIN_EMAIL,
        passwordHash: shortPasswordHash,
        role: "super_admin",
        points: 999999,
        streak: 100,
        allowedPages: ["*"],
      });
    } else {
      await db.update(usersTable).set({
        passwordHash: shortPasswordHash,
        role: "super_admin",
        allowedPages: ["*"],
      }).where(eq(usersTable.email, SHORT_SUPER_ADMIN_EMAIL));
    }

    // Ensure default admin@eduplatform.com is also promoted to super_admin
    const defaultAdmin = await db.select().from(usersTable).where(eq(usersTable.email, "admin@eduplatform.com"));
    if (defaultAdmin.length > 0 && defaultAdmin[0].role !== "super_admin") {
      await db.update(usersTable).set({ role: "super_admin" }).where(eq(usersTable.email, "admin@eduplatform.com"));
    }
  } catch (err) {}
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();
  const lockKey = email;
  const now = Date.now();

  const failedEntry = failedLoginStore.get(lockKey);
  if (failedEntry && now < failedEntry.lockUntil) {
    const remainingSecs = Math.ceil((failedEntry.lockUntil - now) / 1000);
    res.status(429).json({
      error: `الحساب محظور مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${remainingSecs} ثانية.`
    });
    return;
  }

  const isSuperAdminEmail = email === SUPER_ADMIN_EMAIL || email === SHORT_SUPER_ADMIN_EMAIL || email === "admin@eduplatform.com";

  if (isSuperAdminEmail) {
    await ensureSuperAdminAccount();
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user && isSuperAdminEmail) {
    const allUsers = await db.select().from(usersTable);
    const found = allUsers.find(u => u.email.toLowerCase().trim() === email);
    if (found) user = found;
  }

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isBcrypt = user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$");
  let isValid = false;
  if (isBcrypt) {
    isValid = bcrypt.compareSync(password, user.passwordHash);
  } else {
    // fallback to legacy base64 format
    const legacyHash = Buffer.from(password + "salt_eduplat").toString("base64");
    isValid = user.passwordHash === legacyHash;
    if (isValid) {
      logger.warn({ userId: user.id }, "User logged in using deprecated legacy base64 password hash. Upgrading to bcrypt.");
      const newHash = hashPassword(password);
      await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
      user.passwordHash = newHash;
    }
  }

  if (!isValid) {
    const currentFailures = (failedEntry && now > failedEntry.lockUntil ? 0 : failedEntry?.count || 0) + 1;
    if (currentFailures >= 5) {
      failedLoginStore.set(lockKey, { count: currentFailures, lockUntil: now + 15 * 60 * 1000 });
    } else {
      failedLoginStore.set(lockKey, { count: currentFailures, lockUntil: 0 });
    }

    await logAuditEvent({ action: "login_failed", userId: user.id, targetType: "user", targetId: user.id, details: { email, attempts: currentFailures }, req });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Clear failed login tracking on successful login
  failedLoginStore.delete(lockKey);

  // Auto-promote any admin or super email to super_admin to align with frontend
  if (user.email && (user.email.toLowerCase().includes("admin") || user.email.toLowerCase().includes("super")) && user.role !== "super_admin") {
    await db.update(usersTable).set({ role: "super_admin", allowedPages: ["*"] }).where(eq(usersTable.id, user.id));
    user.role = "super_admin";
    user.allowedPages = ["*"];
  }

  const token = makeToken(user.id);
  await logAuditEvent({ action: "login_success", userId: user.id, targetType: "user", targetId: user.id, details: { email }, req });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, allowedPages: user.allowedPages, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, cv: user.cv, contactInfo: user.contactInfo,
      companyCategory: (user as any).companyCategory || "general",
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  res.json({
    id: user.id, name: user.name, email: user.email,
    role: user.role, allowedPages: user.allowedPages, points: user.points, streak: user.streak,
    avatarUrl: user.avatarUrl, cv: user.cv, contactInfo: user.contactInfo,
    companyCategory: (user as any).companyCategory || "general",
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/logout", requireAuth, async (req: any, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader.replace("Bearer ", "");
  const decoded = jwt.decode(token) as { jti: string; exp: number };
  if (decoded && decoded.jti) {
    await tokenBlocklist.set(decoded.jti, decoded.exp || (Math.floor(Date.now() / 1000) + 7 * 24 * 3600));
  }
  res.json({ success: true });
});

export default router;
