import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../lib/secrets";
import { redis } from "../lib/redis";

export interface AuthenticatedRequest extends Request {
  user?: typeof usersTable.$inferSelect;
}

export const tokenBlocklist = {
  async has(jti: string): Promise<boolean> {
    const revoked = await redis.get(`blocklist:${jti}`);
    return revoked === "1";
  },
  async set(jti: string, exp: number): Promise<void> {
    const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
    await redis.set(`blocklist:${jti}`, "1", "EX", ttl);
  }
};

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; jti: string; exp: number };
    
    // Check blocklist
    const isBlocked = await tokenBlocklist.has(decoded.jti);
    if (isBlocked) {
      res.status(401).json({ error: "Token is revoked" });
      return;
    }

    const userId = decoded.userId;
    if (!userId || isNaN(userId)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
