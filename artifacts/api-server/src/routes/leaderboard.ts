import { Router } from "express";
import { db, usersTable, certificatesTable, userProgressTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string || "20", 10) || 20, 100);

  const usersWithCertCount = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      points: usersTable.points,
      streak: usersTable.streak,
      certCount: sql<number>`coalesce(count(${certificatesTable.id}), 0)`,
    })
    .from(usersTable)
    .leftJoin(certificatesTable, eq(usersTable.id, certificatesTable.userId))
    .groupBy(usersTable.id)
    .orderBy(desc(usersTable.points))
    .limit(limit);

  const entries = usersWithCertCount.map((u, idx) => ({
    rank: idx + 1,
    userId: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    points: u.points,
    streak: u.streak,
    certificateCount: Number(u.certCount),
    completedTracks: 0,
  }));

  res.json(entries);
});

export default router;
