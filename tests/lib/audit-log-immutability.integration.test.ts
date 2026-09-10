import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { recordAuditEvent } from '../../src/server/audit/auditLog';

test('AuditLog records are append-only: updates and deletes are rejected at the database boundary', async (context) => {
  const suffix = randomUUID();
  let auditLogId: string | undefined;

  context.after(async () => {
    if (auditLogId) {
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_immutable');
      await prisma.auditLog.deleteMany({ where: { id: auditLogId } });
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_immutable');
    }
  });

  await recordAuditEvent({ actorId: null, action: `TEST_EVENT_${suffix}`, targetType: 'Test', targetId: suffix });
  const created = await prisma.auditLog.findFirstOrThrow({ where: { action: `TEST_EVENT_${suffix}` } });
  auditLogId = created.id;

  await assert.rejects(() => prisma.auditLog.update({ where: { id: auditLogId }, data: { action: 'TAMPERED' } }));
  await assert.rejects(() => prisma.auditLog.delete({ where: { id: auditLogId } }));

  const reloaded = await prisma.auditLog.findUniqueOrThrow({ where: { id: auditLogId } });
  assert.equal(reloaded.action, `TEST_EVENT_${suffix}`);
});

test('AuditLog permits only the actorId-to-null update issued when an actor account is deleted', async (context) => {
  const suffix = randomUUID();
  let userId: string | undefined;
  let auditLogId: string | undefined;

  context.after(async () => {
    if (auditLogId) {
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_immutable');
      await prisma.auditLog.deleteMany({ where: { id: auditLogId } });
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_immutable');
    }
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  });

  const user = await prisma.user.create({
    data: { email: `audit-log-actor-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Audit Log Actor' },
  });
  userId = user.id;
  await recordAuditEvent({ actorId: userId, action: `TEST_EVENT_${suffix}`, targetType: 'Test', targetId: suffix });
  const created = await prisma.auditLog.findFirstOrThrow({ where: { action: `TEST_EVENT_${suffix}` } });
  auditLogId = created.id;

  // Deleting the actor's account fires the AuditLog.actorId_fkey ON DELETE SET NULL action, which the append-only trigger must allow.
  await prisma.user.delete({ where: { id: userId } });
  userId = undefined;

  const reloaded = await prisma.auditLog.findUniqueOrThrow({ where: { id: auditLogId } });
  assert.equal(reloaded.actorId, null);
  assert.equal(reloaded.action, `TEST_EVENT_${suffix}`);
});
