import { PaymentType, Prisma } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { ForbiddenError, ValidationError } from '@/server/auth/session';
import { recordAuditEvent } from '@/server/audit/auditLog';
import type { GrantPaymentWaiverInput } from '@/lib/schemas/paymentWaiver';

const waiverFeeTypes = new Set<PaymentType>(['RETAILER_UNLOCK', 'CLIENT_RELEASE']);

function activeWaiverWhere(userId: string, feeType: PaymentType, now: Date) {
  return { userId, feeType, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export async function listPaymentWaivers() {
  return prisma.paymentWaiver.findMany({
    orderBy: { grantedAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, contactName: true } },
      grantedBy: { select: { contactName: true } },
      revokedBy: { select: { contactName: true } },
      _count: { select: { payments: true } },
    },
  });
}

export async function grantPaymentWaiver(ownerId: string, input: GrantPaymentWaiverInput) {
  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, suspended: true } });
  if (!target || target.role !== 'USER' || target.suspended) throw new ValidationError('Active user account not found');
  const now = new Date();
  const existing = await prisma.paymentWaiver.findFirst({ where: activeWaiverWhere(input.userId, input.feeType, now), select: { id: true } });
  if (existing) throw new ValidationError('An active waiver already exists for this user and fee type');
  const waiver = await prisma.paymentWaiver.create({
    data: { userId: input.userId, feeType: input.feeType, reason: input.reason, grantedById: ownerId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null },
  });
  await recordAuditEvent({ actorId: ownerId, action: 'PAYMENT_WAIVER_GRANTED', targetType: 'PaymentWaiver', targetId: waiver.id, metadata: { userId: waiver.userId, feeType: waiver.feeType, expiresAt: waiver.expiresAt?.toISOString() ?? null } });
  return waiver;
}

export async function revokePaymentWaiver(ownerId: string, waiverId: string, reason: string) {
  const revoked = await prisma.paymentWaiver.updateMany({ where: { id: waiverId, revokedAt: null }, data: { revokedAt: new Date(), revokedById: ownerId, revocationReason: reason } });
  if (revoked.count === 0) throw new ValidationError('Active payment waiver not found');
  await recordAuditEvent({ actorId: ownerId, action: 'PAYMENT_WAIVER_REVOKED', targetType: 'PaymentWaiver', targetId: waiverId, metadata: {} });
}

/** Consumes an active waiver into an immutable confirmed zero-value payment and audit record. */
export async function consumePaymentWaiver(params: { userId: string; feeType: PaymentType; tenderId?: string; quoteId?: string }) {
  if (!waiverFeeTypes.has(params.feeType)) return null;
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const waiver = await transaction.paymentWaiver.findFirst({ where: activeWaiverWhere(params.userId, params.feeType, now), orderBy: { grantedAt: 'desc' } });
    if (!waiver) return null;
    const payment = await transaction.payment.create({
      data: { type: params.feeType, amountGbp: 0, vatPercentage: 0, vatGbp: 0, totalAmountGbp: 0, status: 'CONFIRMED', userId: params.userId, tenderId: params.tenderId, quoteId: params.quoteId, paymentWaiverId: waiver.id, confirmedAt: now },
    });
    await recordAuditEvent({ actorId: params.userId, action: 'PAYMENT_WAIVER_USED', targetType: 'PaymentWaiver', targetId: waiver.id, metadata: { paymentId: payment.id, feeType: params.feeType, tenderId: params.tenderId, quoteId: params.quoteId } }, transaction);
    return { waiver, payment };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function requireWaiverBelongsToUser(waiverId: string, userId: string) {
  const waiver = await prisma.paymentWaiver.findUnique({ where: { id: waiverId } });
  if (!waiver || waiver.userId !== userId) throw new ForbiddenError();
  return waiver;
}