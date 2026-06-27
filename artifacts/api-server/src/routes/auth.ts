import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

function hashPassword(pw: string) {
  // simple hash for demo purposes
  return Buffer.from(pw + "salt_eduplat").toString("base64");
}

function makeToken(userId: number) {
  return Buffer.from(`${userId}:eduplat_token`).toString("base64");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: role ?? "student",
    points: 0,
    streak: 0,
  }).returning();
  const token = makeToken(user.id);
  res.status(201).json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString(),
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
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = makeToken(user.id);
  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString(),
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
    const decoded = Buffer.from(authHeader.replace("Bearer ", ""), "base64").toString();
    const userId = parseInt(decoded.split(":")[0], 10);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id, name: user.name, email: user.email,
      role: user.role, points: user.points, streak: user.streak,
      avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
