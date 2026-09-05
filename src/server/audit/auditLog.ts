import { prisma } from '@/server/data/prisma';
import type { Prisma } from '@prisma/client';

type AuditEvent = {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

type AuditWriter = Pick<Prisma.TransactionClient, 'auditLog'>;

/** Append-only audit trail. Never store secrets or unrestricted contact details here. */
export async function recordAuditEvent(event: AuditEvent, writer: AuditWriter = prisma) {
  await writer.auditLog.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    },
  });
}
