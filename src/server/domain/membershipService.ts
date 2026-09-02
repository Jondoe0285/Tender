import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { createPayment } from '@/server/payments/paymentService';
import { getPlatformSetting } from '@/server/domain/platformSettings';
import { recordAuditEvent } from '@/server/audit/auditLog';

export async function membershipTiersEnabled(): Promise<boolean> {
  return await getPlatformSetting('MEMBERSHIP_TIERS_ACTIVE') === 'true';
}

export async function listAvailableMembershipTiers(retailerId: string) {
  const [enabled, tiers, memberships] = await Promise.all([
    membershipTiersEnabled(),
    prisma.membershipTier.findMany({ where: { active: true }, orderBy: { monthlyPriceGbp: 'asc' } }),
    prisma.retailerMembership.findMany({ where: { retailerId, active: true }, select: { tierId: true } }),
  ]);
  const activeTierIds = new Set(memberships.map((membership) => membership.tierId));
  return { enabled, tiers: enabled ? tiers.map((tier) => ({ ...tier, purchased: activeTierIds.has(tier.id) })) : [] };
}

export async function requestMembershipTierPurchase(retailerId: string, tierId: string) {
  if (!await membershipTiersEnabled()) throw new ForbiddenError('Membership tiers are not active');
  const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
  if (!tier || !tier.active) throw new ForbiddenError('Membership tier is not available');
  const existing = await prisma.retailerMembership.findUnique({ where: { retailerId_tierId: { retailerId, tierId } } });
  if (existing?.active) return { status: 'ACTIVE' as const };
  const payment = await createPayment({ type: 'MEMBERSHIP_TIER', userId: retailerId, tierId });
  return { status: 'PAYMENT_REQUIRED' as const, ...payment };
}

export async function finalizeMembershipTierWithPayment(retailerId: string, tierId: string, paymentId: string) {
  if (!await membershipTiersEnabled()) throw new ForbiddenError('Membership tiers are not active');
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { tier: true } });
  if (!payment || payment.userId !== retailerId || payment.tierId !== tierId || payment.type !== 'MEMBERSHIP_TIER' || payment.status !== 'CONFIRMED' || !payment.tier?.active) {
    throw new ForbiddenError('Payment is not a confirmed membership payment for this Retailer');
  }
  const membership = await prisma.retailerMembership.upsert({
    where: { retailerId_tierId: { retailerId, tierId } },
    update: { active: true, paymentId },
    create: { retailerId, tierId, paymentId, active: true },
  });
  await recordAuditEvent({ actorId: retailerId, action: 'MEMBERSHIP_TIER_PURCHASED', targetType: 'RetailerMembership', targetId: membership.id, metadata: { tierId, paymentId } });
  return membership;
}
