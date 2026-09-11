import { Prisma, type PaymentReversalType } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';

type ReversalInput = {
  stripePaymentIntentId: string;
  stripeEventId: string;
  providerObjectId: string;
  type: PaymentReversalType;
};

type ReversalResult = {
  paymentId: string;
  paymentType: string;
  affectedUserIds: string[];
} | null;

/** Records one Stripe reversal event and removes any access granted by its payment. */
export async function reversePaymentEntitlements(input: ReversalInput): Promise<ReversalResult> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
    include: { unlock: true, releases: true },
  });
  if (!payment) return null;

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.paymentReversal.create({
        data: {
          paymentId: payment.id,
          type: input.type,
          stripeEventId: input.stripeEventId,
          providerObjectId: input.providerObjectId,
        },
      });
      await transaction.payment.update({ where: { id: payment.id }, data: { status: 'REVERSED' } });
      await transaction.unlock.deleteMany({ where: { paymentId: payment.id, method: 'PAID' } });
      await transaction.contactRelease.deleteMany({ where: { authorizingPaymentId: payment.id } });
      await transaction.directContactRequest.updateMany({ where: { paymentId: payment.id, releasedAt: { not: null } }, data: { releasedAt: null } });
      await recordAuditEvent({
        actorId: null,
        action: 'PAYMENT_REVERSED',
        targetType: 'Payment',
        targetId: payment.id,
        metadata: { stripeEventId: input.stripeEventId, type: input.type, providerObjectId: input.providerObjectId },
      }, transaction);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
    throw error;
  }

  const affectedUserIds = new Set([payment.userId]);
  for (const release of payment.releases) {
    affectedUserIds.add(release.clientId);
    affectedUserIds.add(release.retailerId);
  }
  return { paymentId: payment.id, paymentType: payment.type, affectedUserIds: [...affectedUserIds] };
}