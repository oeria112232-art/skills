import { Router } from "express";
import { db, usersTable, certificatesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { GetUserParams, UpdateUserParams, UpdateUserBody } from "@workspace/api-zod";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, name: u.name, email: u.email,
    role: u.role, points: u.points, streak: u.streak,
    avatarUrl: u.avatarUrl, createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(serializeUser));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(user));
});

export default router;
