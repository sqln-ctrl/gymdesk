import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

type AuditValue = Record<string, unknown> | undefined;

const sensitiveKeyPattern = /password|token|secret|cookie|credential/i;

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeAuditValue(nestedValue),
      ]),
    );
  }

  return value;
}

function serializeAuditValue(value: AuditValue): string | null {
  return value === undefined ? null : JSON.stringify(sanitizeAuditValue(value));
}

export async function writeAuditLog(
  client: DatabaseClient,
  input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: AuditValue;
    after?: AuditValue;
    metadata?: AuditValue;
  },
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: serializeAuditValue(input.before),
      afterJson: serializeAuditValue(input.after),
      metadataJson: serializeAuditValue(input.metadata),
    },
  });
}
