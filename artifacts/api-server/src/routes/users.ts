import { Router } from "express";
import { db, usersTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import path from "path";
import { GetUserParams, UpdateUserParams, UpdateUserBody, CreateUserBody, DeleteUserParams } from "@workspace/api-zod";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { logAuditEvent } from "../services/audit-log";
import { hashPassword } from "../services/auth-utils";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, name: u.name, email: u.email,
    role: u.role, allowedPages: u.allowedPages, points: u.points, streak: u.streak,
    avatarUrl: u.avatarUrl, cv: u.cv, contactInfo: u.contactInfo,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const activeUsers = users.filter(u => !u.deletedAt);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const paginated = activeUsers.slice(offset, offset + limit);
  res.json({ data: paginated.map(serializeUser), total: activeUsers.length, limit, offset });
});

router.get("/users/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  
  if (req.user?.role !== "admin" && req.user?.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user || user.deletedAt) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(user));
});

router.patch("/users/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  
  if (req.user?.role !== "admin" && req.user?.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!existingUser || existingUser.deletedAt) { res.status(404).json({ error: "User not found" }); return; }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAuditEvent({ action: "user_update", userId: req.user!.id, targetType: "user", targetId: params.data.id, details: { fields: Object.keys(parsed.data) }, req });
  res.json(serializeUser(user));
});

router.post("/users", requireAuth, requireRole(["admin"]), async (req: any, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, email, password, role } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const [newUser] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: role || "student",
    points: 0,
    streak: 0,
  }).returning();
  await logAuditEvent({ action: "user_create_admin", userId: req.user!.id, targetType: "user", targetId: newUser.id, details: { email, role }, req });
  res.status(201).json(serializeUser(newUser));
});

router.delete("/users/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  
  const user = (req as any).user;
  if (user?.role !== "admin" && user?.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.update(usersTable).set({ deletedAt: new Date() }).where(eq(usersTable.id, params.data.id));
  await logAuditEvent({ action: "user_delete", userId: req.user!.id, targetType: "user", targetId: params.data.id, details: {}, req });
  res.status(204).send();
});

router.post("/users/:id/avatar", requireAuth, async (req: any, res): Promise<void> => {
  const userId = parseInt((req.params.id as string) || "0", 10);
  if (isNaN(userId) || userId <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  
  if (req.user?.role !== "admin" && req.user?.id !== userId) {
    res.status(403).json({ error: "Forbidden: Cannot update someone else's avatar" });
    return;
  }
  
  const { fileName, fileType, base64Data } = req.body;
  if (!fileName || !fileType || !base64Data) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Validate avatar file type
  const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const ALLOWED_AVATAR_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const avatarExt = path.extname(fileName).toLowerCase();
  if (!ALLOWED_AVATAR_TYPES.includes(fileType) && !ALLOWED_AVATAR_EXTS.includes(avatarExt)) {
    res.status(400).json({ error: "Invalid file type. Allowed: jpg, png, gif, webp" });
    return;
  }

  // Validate base64 size (max 2MB for avatars)
  const estimatedSize = Math.ceil(base64Data.length * 3 / 4);
  if (estimatedSize > 2 * 1024 * 1024) {
    res.status(400).json({ error: "Avatar too large. Maximum 2MB allowed" });
    return;
  }
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  
  try {
    // Normalize to a proper data URL if not already
    let dataUrl: string;
    if (base64Data.startsWith("data:")) {
      dataUrl = base64Data;
    } else {
      const mimeType = fileType.includes("/") ? fileType : `image/${fileType.replace(/^\./, "")}`;
      dataUrl = `data:${mimeType};base64,${base64Data}`;
    }
    
    // Also update CV avatarUrl if it exists
    let updatedCv = user.cv;
    if (updatedCv && typeof updatedCv === "object") {
      updatedCv = { ...updatedCv, avatarUrl: dataUrl };
    }
    
    // Store the data URL directly in the database (Firebase)
    // This ensures persistence across server restarts
    const [updatedUser] = await db.update(usersTable)
      .set({ avatarUrl: dataUrl, cv: updatedCv })
      .where(eq(usersTable.id, userId))
      .returning();
      
    res.json(serializeUser(updatedUser));
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

export default router;
