import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { createPayment } from '@/server/payments/paymentService';
import { getPlatformSetting } from '@/server/domain/platformSettings';
import { recordAuditEvent } from '@/server/audit/auditLog';

export function getSponsoredPlacementExpiry(purchasedAt = new Date()): Date {
  const targetMonth = purchasedAt.getUTCMonth() + 1;
  const targetYear = purchasedAt.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(purchasedAt.getUTCDate(), lastDay), purchasedAt.getUTCHours(), purchasedAt.getUTCMinutes(), purchasedAt.getUTCSeconds(), purchasedAt.getUTCMilliseconds()));
}

function activePlacementWhere(retailerId: string, now = new Date()) {
  return { retailerId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export async function sponsoredPlacementEnabled(): Promise<boolean> {
  return await getPlatformSetting('SPONSORED_PLACEMENT_ACTIVE') === 'true';
}

export async function requestSponsoredPlacement(retailerId: string) {
  if (!await sponsoredPlacementEnabled()) throw new ForbiddenError('Sponsored placement is not active');
  const existing = await prisma.retailerSponsoredPlacement.findFirst({ where: activePlacementWhere(retailerId) });
  if (existing) return { status: 'ACTIVE' as const };
  const payment = await createPayment({ type: 'SPONSORED_PLACEMENT', userId: retailerId });
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
    create: { retailerId, paymentId, active: true, expiresAt: getSponsoredPlacementExpiry() },
  });
  await recordAuditEvent({ actorId: retailerId, action: 'SPONSORED_PLACEMENT_ACTIVATED', targetType: 'RetailerSponsoredPlacement', targetId: placement.id, metadata: { paymentId, expiresAt: placement.expiresAt?.toISOString() } });
  return placement;
}