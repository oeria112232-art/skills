import { Router } from "express";
import { db, tracksTable, trackModulesTable, userProgressTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  GetTrackParams, GetTrackProgressParams, UpdateTrackProgressParams, UpdateTrackProgressBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/tracks", async (_req, res): Promise<void> => {
  const tracks = await db.select().from(tracksTable).orderBy(tracksTable.id);
  res.json(tracks.map(t => ({ ...t, createdAt: t.createdAt?.toISOString() })));
});

router.get("/tracks/:slug", async (req, res): Promise<void> => {
  const params = GetTrackParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }
  const modules = await db.select().from(trackModulesTable)
    .where(eq(trackModulesTable.trackId, track.id))
    .orderBy(trackModulesTable.order);
  res.json({
    ...track,
    createdAt: track.createdAt?.toISOString(),
    modules: modules.map(m => ({ ...m, createdAt: m.createdAt?.toISOString() })),
  });
});

router.get("/tracks/:slug/progress", async (req, res): Promise<void> => {
  const params = GetTrackProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const userId = parseInt(req.query.userId as string || "1", 10);
  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }

  const progress = await db.select().from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.trackId, track.id)));

  const completedModules = progress.filter(p => p.completed === 1).map(p => p.moduleId);
  const totalModules = track.moduleCount;
  const percentComplete = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

  res.json({
    userId, trackSlug: params.data.slug,
    completedModules, totalModules,
    percentComplete,
    points: completedModules.length * 10,
  });
});

router.post("/tracks/:slug/progress", async (req, res): Promise<void> => {
  const params = UpdateTrackProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }
  const parsed = UpdateTrackProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [track] = await db.select().from(tracksTable).where(eq(tracksTable.slug, params.data.slug));
  if (!track) { res.status(404).json({ error: "Track not found" }); return; }

  const existing = await db.select().from(userProgressTable)
    .where(and(
      eq(userProgressTable.userId, parsed.data.userId),
      eq(userProgressTable.trackId, track.id),
      eq(userProgressTable.moduleId, parsed.data.moduleId)
    ));

  if (existing.length > 0) {
    await db.update(userProgressTable)
      .set({ completed: parsed.data.completed ? 1 : 0, completedAt: parsed.data.completed ? new Date() : null })
      .where(eq(userProgressTable.id, existing[0].id));
  } else {
    await db.insert(userProgressTable).values({
      userId: parsed.data.userId,
      trackId: track.id,
      moduleId: parsed.data.moduleId,
      completed: parsed.data.completed ? 1 : 0,
      completedAt: parsed.data.completed ? new Date() : null,
    });
  }

  // Return updated progress
  const progress = await db.select().from(userProgressTable)
    .where(and(eq(userProgressTable.userId, parsed.data.userId), eq(userProgressTable.trackId, track.id)));
  const completedModules = progress.filter(p => p.completed === 1).map(p => p.moduleId);
  const totalModules = track.moduleCount;
  const percentComplete = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

  res.json({
    userId: parsed.data.userId, trackSlug: params.data.slug,
    completedModules, totalModules, percentComplete,
    points: completedModules.length * 10,
  });
});

export default router;
