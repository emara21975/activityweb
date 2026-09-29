import { prisma } from "../db/prisma";

export interface LogAuditOptions {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  requestId?: string;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "personal_number",
  "secret",
  "token",
  "hash",
]);

function redactSensitive(data: unknown): string | null {
  if (data === undefined || data === null) return null;
  try {
    const jsonStr = JSON.stringify(data, (key, value) => {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        return "***REDACTED***";
      }
      return value;
    });
    return jsonStr;
  } catch {
    return null;
  }
}

export async function logAudit(options: LogAuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        actor_user_id: options.actorUserId || null,
        action: options.action,
        entity_type: options.entityType,
        entity_id: options.entityId,
        before_json_redacted: redactSensitive(options.beforeData),
        after_json_redacted: redactSensitive(options.afterData),
        request_id: options.requestId || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
