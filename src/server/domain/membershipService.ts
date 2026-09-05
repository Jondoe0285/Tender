import { prisma } from '@/server/data/prisma';
import { ForbiddenError } from '@/server/auth/session';
import { createPayment } from '@/server/payments/paymentService';
import { getPlatformSetting } from '@/server/domain/platformSettings';
import { recordAuditEvent } from '@/server/audit/auditLog';

const DEFAULT_MEMBERSHIP_TIERS = [
  { name: 'Free', monthlyPriceGbp: 0, freeTenderOpportunitiesPerMonth: 0, description: 'Matched summaries and pay-per-tender unlocks.' },
  { name: 'Starter', monthlyPriceGbp: 29, freeTenderOpportunitiesPerMonth: 10, description: 'Suitable for small local suppliers or occasional users.' },
  { name: 'Growth', monthlyPriceGbp: 49, freeTenderOpportunitiesPerMonth: 20, description: 'Suitable for active suppliers receiving regular enquiries.' },
  { name: 'Pro', monthlyPriceGbp: 99, freeTenderOpportunitiesPerMonth: 9999, description: 'Suitable for regional suppliers or higher-volume Providers.' },
  { name: 'Enterprise', monthlyPriceGbp: 199, freeTenderOpportunitiesPerMonth: 9999, description: 'Suitable for larger businesses, multi-branch suppliers, or high-volume users.' },
] as const;

export async function ensureDefaultMembershipTiers() {
  const existing = await prisma.membershipTier.findMany({ select: { id: true, name: true } });
  const existingNames = new Set(existing.map((tier) => tier.name));

  for (const tier of DEFAULT_MEMBERSHIP_TIERS) {
    if (existingNames.has(tier.name)) continue;
    await prisma.membershipTier.create({
      data: {
        name: tier.name,
        description: tier.description,
        monthlyPriceGbp: tier.monthlyPriceGbp,
        freeTenderOpportunitiesPerMonth: tier.freeTenderOpportunitiesPerMonth,
        active: false,
      },
    });
  }

  const upToDate = await prisma.membershipTier.findMany({ where: { name: { in: DEFAULT_MEMBERSHIP_TIERS.map((tier) => tier.name) } } });
  for (const tier of upToDate) {
    const desired = DEFAULT_MEMBERSHIP_TIERS.find((item) => item.name === tier.name);
    if (!desired) continue;
    const shouldUpdate = tier.monthlyPriceGbp !== desired.monthlyPriceGbp
      || tier.freeTenderOpportunitiesPerMonth !== desired.freeTenderOpportunitiesPerMonth
      || tier.description !== desired.description
      || tier.active;

    if (shouldUpdate) {
      await prisma.membershipTier.update({
        where: { id: tier.id },
        data: {
          monthlyPriceGbp: desired.monthlyPriceGbp,
          freeTenderOpportunitiesPerMonth: desired.freeTenderOpportunitiesPerMonth,
          description: desired.description,
          active: false,
        },
      });
    }
  }
}

export async function membershipTiersEnabled(): Promise<boolean> {
  return await getPlatformSetting('MEMBERSHIP_TIERS_ACTIVE') === 'true';
}

export async function listAvailableMembershipTiers(retailerId: string) {
  await ensureDefaultMembershipTiers();
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
