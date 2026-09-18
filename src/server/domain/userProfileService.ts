import { prisma } from '@/server/data/prisma';
import { isVerificationEligible } from '@/lib/categories';
import { syncVerificationExpiry } from '@/server/domain/verificationDocumentService';

export type ActivityPeriod = '1d' | '7d' | '30d' | '90d' | 'all';

export function getActivitySince(period: ActivityPeriod): Date | null {
  if (period === 'all') return null;
  const days = Number(period.slice(0, -1));
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Consolidated Super User view: profile fields, login/session analytics, recent pages, and recent actions. */
export async function getUserAnalyticsProfile(userId: string, period: ActivityPeriod = '1d') {
  await syncVerificationExpiry(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      retailerProfile: true,
      primaryClientCompany: true,
      clientCompanyMembership: { include: { company: true } },
      memberships: { where: { active: true }, include: { tier: true } },
      subscriptions: { where: { active: true }, include: { plan: true } },
    },
  });
  if (!user) return null;

  const activitySince = getActivitySince(period);
  const activityWhere = activitySince ? { userId, createdAt: { gte: activitySince } } : { userId };
  const auditWhere = activitySince ? { actorId: userId, createdAt: { gte: activitySince } } : { actorId: userId };
  const [pageViews, auditLogs, warnings, membershipTiers, subscriptionPlans] = await Promise.all([
    prisma.pageView.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.tenderWarning.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, note: true, active: true, createdAt: true, tender: { select: { reference: true } }, issuedBy: { select: { contactName: true } } },
    }),
    prisma.membershipTier.findMany({ orderBy: { monthlyPriceGbp: 'asc' }, select: { id: true, name: true, active: true, monthlyPriceGbp: true, freeTenderOpportunitiesPerMonth: true, additionalCreditDiscountPercentage: true } }),
    prisma.subscriptionPlan.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const company = user.retailerProfile?.companyName ?? user.primaryClientCompany?.companyName ?? user.clientCompanyMembership?.company.companyName ?? null;
  const address = user.retailerProfile?.address ?? null;

  return {
    id: user.id,
    email: user.email,
    contactName: user.contactName,
    contactPhone: user.contactPhone,
    role: user.role,
    suspended: user.suspended,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    lastLogoutAt: user.lastLogoutAt,
    totalTimeOnlineSeconds: user.totalTimeOnlineSeconds,
    company,
    address,
    isSoleTrader: user.retailerProfile?.isSoleTrader ?? false,
    launchCreditsLeft: user.retailerProfile?.launchCreditsLeft ?? null,
    releaseCreditsLeft: user.clientCompanyMembership?.company.releaseCreditsLeft ?? null,
    verificationStatus: user.retailerProfile?.verificationStatus ?? null,
    verificationEligible: user.retailerProfile ? isVerificationEligible(user.retailerProfile.categories) : false,
    verificationRequestedAt: user.retailerProfile?.verificationRequestedAt ?? null,
    verificationConfidencePercent: user.retailerProfile?.verificationConfidencePercent ?? null,
    verificationReport: user.retailerProfile?.verificationReport ?? null,
    independentReviewStatus: user.retailerProfile?.independentReviewStatus ?? null,
    independentReviewTier: user.retailerProfile?.independentReviewTier ?? null,
    independentReviewPurchasedAt: user.retailerProfile?.independentReviewPurchasedAt ?? null,
    independentReviewNote: user.retailerProfile?.independentReviewNote ?? null,
    pageViews,
    auditLogs,
    warnings,
    activityPeriod: period,
    memberships: user.memberships.map((membership) => ({ tierId: membership.tierId, name: membership.tier.name, assignedAt: membership.assignedAt, expiresAt: membership.expiresAt })),
    subscriptions: user.subscriptions.map((subscription) => ({ planId: subscription.planId, name: subscription.plan.name })),
    availableMembershipTiers: membershipTiers,
    availableSubscriptionPlans: subscriptionPlans,
  };
}

export type UserAnalyticsProfile = NonNullable<Awaited<ReturnType<typeof getUserAnalyticsProfile>>>;
