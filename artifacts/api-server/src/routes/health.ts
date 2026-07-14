import { Router, type IRouter } from "express";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // 1. Check Firebase connectivity
  try {
    const start = Date.now();
    await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "point_price_cents"));
    checks.firebase = `ok (${Date.now() - start}ms)`;
  } catch (e: any) {
    checks.firebase = `error: connection failed`;
    healthy = false;
  }

  // 2. Check Daily.co connectivity
  try {
    const start = Date.now();
    const response = await fetch("https://api.daily.co/v1/rooms", { method: "OPTIONS" });
    checks.daily = `ok (${Date.now() - start}ms)`;
  } catch (e: any) {
    checks.daily = `error: unreachable`;
    // Not marking as unhealthy as some rooms might still work if it's a transient error
  }

  // 3. Check R2 Configuration
  try {
    const { platformSettingsTable: settings } = await import("@workspace/db");
    const config = await db.select().from(settings).where(eq(settings.key, "r2_bucket_name"));
    if (!config || config.length === 0) {
      checks.r2 = "error: bucket not configured";
      healthy = false;
    } else {
      checks.r2 = "ok (configured)";
    }
  } catch (e: any) {
    checks.r2 = `error: ${e.message}`;
    healthy = false;
  }

  // Check memory usage
  const mem = process.memoryUsage();
  checks.memory = `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`;
  checks.uptime = `${Math.round(process.uptime())}s`;

  const statusCode = healthy ? 200 : 503;
  res.status(statusCode).json({
    status: healthy ? "ok" : "degraded",
    checks,
  });
});

export default router;
