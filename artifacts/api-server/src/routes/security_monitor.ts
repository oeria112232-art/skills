import { Router } from "express";
import { db, platformSettingsTable, auditLogTable, usersTable } from "@workspace/db";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";
import { logAuditEvent } from "../services/audit-log";
import { redis } from "../lib/redis";

const router = Router();
const MAINTENANCE_CACHE_KEY = "cache:system:maintenance_pages";

// 1. GET /system/maintenance - Get currently locked maintenance pages
router.get("/system/maintenance", async (_req, res): Promise<void> => {
  try {
    const cached = await redis.get(MAINTENANCE_CACHE_KEY);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } catch (e) {}

  try {
    const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "maintenance_pages"));
    let lockedPages: string[] = [];
    if (row && row.value) {
      try {
        lockedPages = JSON.parse(row.value);
      } catch (e) {}
    }

    try {
      await redis.set(MAINTENANCE_CACHE_KEY, JSON.stringify({ lockedPages }), "EX", 300);
    } catch (e) {}

    res.json({ lockedPages });
  } catch (err) {
    res.json({ lockedPages: [] });
  }
});

// 2. POST /admin/maintenance/toggle - Lock or unlock a page section (Super Admin / Admin)
router.post("/admin/maintenance/toggle", requireAuth, requireRole(["super_admin", "admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { pageId, locked } = req.body; // pageId e.g. "workshops", "jobs", "consultations"
    if (!pageId || typeof pageId !== "string") {
      res.status(400).json({ error: "pageId is required" });
      return;
    }

    const [existing] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "maintenance_pages"));
    let currentLocked: string[] = [];
    if (existing && existing.value) {
      try { currentLocked = JSON.parse(existing.value); } catch (e) {}
    }

    if (locked) {
      if (!currentLocked.includes(pageId)) currentLocked.push(pageId);
    } else {
      currentLocked = currentLocked.filter(p => p !== pageId);
    }

    const jsonVal = JSON.stringify(currentLocked);
    if (existing) {
      await db.update(platformSettingsTable)
        .set({ value: jsonVal, updatedAt: new Date() })
        .where(eq(platformSettingsTable.key, "maintenance_pages"));
    } else {
      await db.insert(platformSettingsTable).values({
        key: "maintenance_pages",
        value: jsonVal,
        label: "Locked Maintenance Pages",
      });
    }

    // Invalidate cache
    try { await redis.del(MAINTENANCE_CACHE_KEY); } catch (e) {}

    await logAuditEvent({
      action: locked ? "maintenance_page_lock" : "maintenance_page_unlock",
      userId: req.user!.id,
      targetType: "system",
      details: { pageId, locked, userEmail: req.user!.email },
      req,
    });

    res.json({ success: true, lockedPages: currentLocked });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET /admin/security/audit-feed - Get live activity audit logs
router.get("/admin/security/audit-feed", requireAuth, requireRole(["super_admin", "admin"]), async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string || "30", 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || "").trim();

    let logs;
    if (search) {
      logs = await db.select().from(auditLogTable)
        .where(or(
          like(auditLogTable.action, `%${search}%`),
          like(auditLogTable.targetType, `%${search}%`),
          like(auditLogTable.ipAddress, `%${search}%`)
        ))
        .orderBy(desc(auditLogTable.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      logs = await db.select().from(auditLogTable)
        .orderBy(desc(auditLogTable.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // Populate user details for each log
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as number[];
    let userMap: Record<number, { name: string; email: string; role: string }> = {};
    if (userIds.length > 0) {
      const users = await db.select().from(usersTable).where(sql`${usersTable.id} IN ${userIds}`);
      for (const u of users) {
        userMap[u.id] = { name: u.name, email: u.email, role: u.role };
      }
    }

    const formattedLogs = logs.map(l => ({
      ...l,
      userName: l.userId ? userMap[l.userId]?.name || "مستخدم" : "نظام/زائر",
      userEmail: l.userId ? userMap[l.userId]?.email || "" : "",
      userRole: l.userId ? userMap[l.userId]?.role || "" : "",
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    }));

    res.json({ page, limit, logs: formattedLogs });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. GET /admin/security/alerts - Real-time security alerts & anomaly summary
router.get("/admin/security/alerts", requireAuth, requireRole(["super_admin", "admin"]), async (_req, res): Promise<void> => {
  try {
    const recentLogs = await db.select().from(auditLogTable)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(200);

    const failedLogins = recentLogs.filter(l => l.action === "login_failed");
    const roleChanges = recentLogs.filter(l => l.action.includes("role") || l.action.includes("user_update"));
    const maintenanceLocks = recentLogs.filter(l => l.action.includes("maintenance"));

    const alerts = [];

    if (failedLogins.length > 5) {
      alerts.push({
        id: "alert-failed-logins",
        severity: "warning",
        title: "ارتفاع في محاولات تسجيل الدخول الخاطئة",
        description: `تم رصد ${failedLogins.length} محاولة دخول خاطئة مؤخراً. نظام الحظر التلقائي متأهب.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (roleChanges.length > 0) {
      alerts.push({
        id: "alert-role-changes",
        severity: "info",
        title: "نشاط تعديل حسابات وصلاحيات",
        description: `تم رصد ${roleChanges.length} عملية تعديل حسابات أو صلاحيات مؤخراً.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (maintenanceLocks.length > 0) {
      alerts.push({
        id: "alert-maintenance-toggles",
        severity: "important",
        title: "تغيير حالة صيانة الصفحات",
        description: `تم تغيير حالة صيانة بعض أقسام الموقع مؤخراً من قبل الإدارة.`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      alerts,
      summary: {
        totalAuditLogs: recentLogs.length,
        failedLoginsCount: failedLogins.length,
        roleChangesCount: roleChanges.length,
        maintenanceLocksCount: maintenanceLocks.length,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
