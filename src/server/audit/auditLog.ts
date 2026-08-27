import { prisma } from '@/server/data/prisma';

type AuditEvent = {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

/** Append-only audit trail. Never store secrets or unrestricted contact details here. */
export async function recordAuditEvent(event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    },
  });
}
