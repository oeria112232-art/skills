import { Router } from "express";
import { db, usersTable, certificatesTable, userProgressTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string || "20", 10);
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.points)).limit(limit);

  const entries = await Promise.all(users.map(async (u, idx) => {
    const [{ count: certCount }] = await db.select({ count: sql<number>`count(*)` })
      .from(certificatesTable).where(eq(certificatesTable.userId, u.id));
    return {
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      points: u.points,
      streak: u.streak,
      certificateCount: Number(certCount),
      completedTracks: 0,
    };
  }));

  res.json(entries);
});

export default router;
