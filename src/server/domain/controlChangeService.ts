import { prisma } from '@/server/data/prisma';
import { ForbiddenError, ValidationError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { isFourEyesSettingKey, type FourEyesSettingKey } from '@/lib/enterprise-controls';
import { grantPaymentWaiver, revokePaymentWaiver } from '@/server/domain/paymentWaiverService';
import type { GrantPaymentWaiverInput } from '@/lib/schemas/paymentWaiver';

export type ControlChangeKind = 'FEE' | 'WAIVER_GRANT' | 'WAIVER_REVOKE';

export async function listPendingControlChanges() {
  return prisma.controlChange.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { proposedBy: { select: { id: true, email: true, contactName: true } } },
  });
}

async function assertSecondOwnerExists(excludingId: string) {
  const other = await prisma.user.findFirst({
    where: { isOwner: true, suspended: false, NOT: { id: excludingId } },
    select: { id: true },
  });
  if (!other) {
    throw new ValidationError('A second Owner must confirm VAT, fee-mode, and waiver changes. Create another Owner before proposing this change.');
  }
}

export async function proposeFeeChange(actorId: string, key: FourEyesSettingKey, value: string | number) {
  await assertSecondOwnerExists(actorId);
  const change = await prisma.controlChange.create({
    data: {
      kind: 'FEE',
      settingKey: key,
      proposedValue: String(value),
      proposedById: actorId,
    },
  });
  await recordAuditEvent({
    actorId,
    action: 'CONTROL_CHANGE_PROPOSED',
    targetType: 'ControlChange',
    targetId: change.id,
    metadata: { kind: 'FEE', settingKey: key, proposedValue: String(value) },
  });
  return change;
}

export async function proposeWaiverGrant(actorId: string, input: GrantPaymentWaiverInput) {
  await assertSecondOwnerExists(actorId);
  const change = await prisma.controlChange.create({
    data: {
      kind: 'WAIVER_GRANT',
      proposedValue: input.feeType,
      payloadJson: JSON.stringify(input),
      proposedById: actorId,
    },
  });
  await recordAuditEvent({
    actorId,
    action: 'CONTROL_CHANGE_PROPOSED',
    targetType: 'ControlChange',
    targetId: change.id,
    metadata: { kind: 'WAIVER_GRANT', userId: input.userId, feeType: input.feeType },
  });
  return change;
}

export async function proposeWaiverRevoke(actorId: string, waiverId: string, reason: string) {
  await assertSecondOwnerExists(actorId);
  const change = await prisma.controlChange.create({
    data: {
      kind: 'WAIVER_REVOKE',
      proposedValue: waiverId,
      payloadJson: JSON.stringify({ waiverId, reason }),
      proposedById: actorId,
    },
  });
  await recordAuditEvent({
    actorId,
    action: 'CONTROL_CHANGE_PROPOSED',
    targetType: 'ControlChange',
    targetId: change.id,
    metadata: { kind: 'WAIVER_REVOKE', waiverId },
  });
  return change;
}

export async function confirmControlChange(confirmerId: string, changeId: string) {
  const change = await prisma.controlChange.findUnique({ where: { id: changeId } });
  if (!change || change.status !== 'PENDING') throw new ValidationError('Pending control change not found');
  if (change.proposedById === confirmerId) throw new ForbiddenError('The proposing Owner cannot confirm their own change');

  if (change.kind === 'FEE') {
    if (!change.settingKey || !isFourEyesSettingKey(change.settingKey)) throw new ValidationError('Invalid fee change');
    await prisma.platformSetting.upsert({
      where: { key: change.settingKey },
      update: { value: change.proposedValue },
      create: { key: change.settingKey, value: change.proposedValue },
    });
    await recordAuditEvent({
      actorId: confirmerId,
      action: 'PLATFORM_FEE_UPDATED',
      targetType: 'PlatformSetting',
      targetId: change.settingKey,
      metadata: { value: change.proposedValue, confirmedChangeId: change.id, proposedById: change.proposedById },
    });
  } else if (change.kind === 'WAIVER_GRANT') {
    const payload = JSON.parse(change.payloadJson) as GrantPaymentWaiverInput;
    await grantPaymentWaiver(change.proposedById, payload);
  } else if (change.kind === 'WAIVER_REVOKE') {
    const payload = JSON.parse(change.payloadJson) as { waiverId: string; reason: string };
    await revokePaymentWaiver(change.proposedById, payload.waiverId, payload.reason);
  } else {
    throw new ValidationError('Unsupported control change');
  }

  const confirmed = await prisma.controlChange.update({
    where: { id: changeId },
    data: { status: 'CONFIRMED', confirmedById: confirmerId, confirmedAt: new Date() },
  });
  await recordAuditEvent({
    actorId: confirmerId,
    action: 'CONTROL_CHANGE_CONFIRMED',
    targetType: 'ControlChange',
    targetId: change.id,
    metadata: { kind: change.kind, settingKey: change.settingKey },
  });
  return confirmed;
}

export async function rejectControlChange(actorId: string, changeId: string) {
  const change = await prisma.controlChange.findUnique({ where: { id: changeId } });
  if (!change || change.status !== 'PENDING') throw new ValidationError('Pending control change not found');
  const rejected = await prisma.controlChange.update({
    where: { id: changeId },
    data: { status: 'REJECTED', confirmedById: actorId, rejectedAt: new Date() },
  });
  await recordAuditEvent({
    actorId,
    action: 'CONTROL_CHANGE_REJECTED',
    targetType: 'ControlChange',
    targetId: change.id,
    metadata: { kind: change.kind },
  });
  return rejected;
}
