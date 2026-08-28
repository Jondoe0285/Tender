import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { createPayment } from '@/server/payments/paymentService';
import { getPaymentFeeGbp, getPlatformSetting } from '@/server/domain/platformSettings';
import { recordAuditEvent } from '@/server/audit/auditLog';

export async function sponsoredPlacementEnabled(): Promise<boolean> {
  return await getPlatformSetting('SPONSORED_PLACEMENT_ACTIVE') === 'true';
}

export async function requestSponsoredPlacement(retailerId: string) {
  if (!await sponsoredPlacementEnabled()) throw new ForbiddenError('Sponsored placement is not active');
  const existing = await prisma.retailerSponsoredPlacement.findFirst({ where: { retailerId, active: true } });
  if (existing) return { status: 'ACTIVE' as const };
  const payment = await createPayment({ type: 'SPONSORED_PLACEMENT', amountGbp: await getPaymentFeeGbp('SPONSORED_PLACEMENT'), userId: retailerId });
  return { status: 'PAYMENT_REQUIRED' as const, ...payment };
}

export async function finalizeSponsoredPlacementWithPayment(retailerId: string, paymentId: string) {
  if (!await sponsoredPlacementEnabled()) throw new ForbiddenError('Sponsored placement is not active');
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== retailerId || payment.type !== 'SPONSORED_PLACEMENT' || payment.status !== 'CONFIRMED') {
    throw new ForbiddenError('Payment is not a confirmed sponsored placement payment for this Retailer');
  }
  const placement = await prisma.retailerSponsoredPlacement.upsert({
    where: { paymentId },
    update: { active: true },
    create: { retailerId, paymentId, active: true },
  });
  await recordAuditEvent({ actorId: retailerId, action: 'SPONSORED_PLACEMENT_ACTIVATED', targetType: 'RetailerSponsoredPlacement', targetId: placement.id, metadata: { paymentId } });
  return placement;
}