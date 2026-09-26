import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

type AuditPayload = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

const REDACTED_KEYS = new Set([
  "passwordHash",
  "emailVerifyToken",
  "resetPasswordToken",
  "tokenHash",
  "password",
]);

function redact(obj: Record<string, unknown>): Prisma.InputJsonValue {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      REDACTED_KEYS.has(k) ? "[REDACTED]" : v,
    ]),
  ) as Prisma.InputJsonValue;
}

export async function writeAudit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: payload.actorId,
        actorEmail: payload.actorEmail,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        oldValue: payload.oldValue ? redact(payload.oldValue) : undefined,
        newValue: payload.newValue ? redact(payload.newValue) : undefined,
        ip: payload.ip,
        userAgent: payload.userAgent,
      },
    });
  } catch (err) {
    // Audit failure must never break the request
    logger.error("audit log write failed", { action: payload.action, resource: payload.resource, err: String(err) });
  }
}
