import { db, auditLogTable } from "@workspace/db";
import type { Request } from "express";
import { logger } from "../lib/logger";

export async function logAuditEvent(params: {
  action: string;
  userId?: number | null;
  targetType?: string;
  targetId?: number;
  details?: any;
  req?: Request;
}): Promise<void> {
  try {
    const ip = params.req
      ? ((params.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || params.req.ip || "unknown")
      : "system";
    const ua = params.req?.headers["user-agent"] || "system";

    await db.insert(auditLogTable).values({
      action: params.action,
      userId: params.userId ?? null,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch (err) {
    // Audit logging should never crash the main request
    logger.error({ err }, "Audit log error");
  }
}
