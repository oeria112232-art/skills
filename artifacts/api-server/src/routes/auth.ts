import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { logAuditEvent } from "../services/audit-log";
import { requireAuth, tokenBlocklist } from "../middlewares/auth";
import { hashPassword } from "../services/auth-utils";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!JWT_SECRET) {
    logger.fatal("FATAL: JWT_SECRET (or SESSION_SECRET) must be set in environment variables.");
  process.exit(1);
}

const router = Router();

function makeToken(userId: number) {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: "7d" });
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
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
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
      // Dynamically upgrade hash to bcrypt!
      const newHash = hashPassword(password);
      await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
      user.passwordHash = newHash;
    }
  }

  if (!isValid) {
    await logAuditEvent({ action: "login_failed", userId: user.id, targetType: "user", targetId: user.id, details: { email }, req });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken(user.id);
  await logAuditEvent({ action: "login_success", userId: user.id, targetType: "user", targetId: user.id, details: { email }, req });
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, allowedPages: user.allowedPages, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, cv: user.cv, contactInfo: user.contactInfo,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const userId = decoded.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id, name: user.name, email: user.email,
      role: user.role, allowedPages: user.allowedPages, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, cv: user.cv, contactInfo: user.contactInfo,
      createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/auth/logout", requireAuth, async (req: any, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader.replace("Bearer ", "");
  const decoded = jwt.decode(token) as { jti: string; exp: number };
  if (decoded && decoded.jti) {
    tokenBlocklist.set(decoded.jti, decoded.exp);
  }
  res.json({ success: true });
});

export default router;
