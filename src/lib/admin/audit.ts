import "server-only";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { clientAddress, sha256 } from "@/lib/security/request";

const SECRET_KEYS = /(password|secret|token|authorization|cookie|signed.?url|recovery)/i;

export function sanitizeAuditValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.test(key)) continue;
    if (child && typeof child === "object" && !Array.isArray(child)) output[key] = sanitizeAuditValue(child);
    else output[key] = child;
  }
  return output;
}

export function requestAuditMetadata(request: Request): Record<string, unknown> {
  const auditSalt = process.env.RATE_LIMIT_SALT || process.env.AUTH_SECRET || "development-only-audit-salt";
  return {
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    ipHash: sha256(`${auditSalt}:${clientAddress(request)}`),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
  };
}

export async function writeAudit(input: {
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    beforeValue: sanitizeAuditValue(input.before),
    afterValue: sanitizeAuditValue(input.after),
    metadata: input.metadata ?? {},
  });
}
