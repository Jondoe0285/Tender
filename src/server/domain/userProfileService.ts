import { prisma } from '@/server/data/prisma';

/** Consolidated Super User view: profile fields, login/session analytics, recent pages, and recent actions. */
export async function getUserAnalyticsProfile(userId: string) {
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

  const [pageViews, auditLogs, warnings, membershipTiers, subscriptionPlans] = await Promise.all([
    prisma.pageView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.tenderWarning.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, reason: true, note: true, active: true, createdAt: true, tender: { select: { reference: true } }, issuedBy: { select: { contactName: true } } },
    }),
    prisma.membershipTier.findMany({ where: { active: true }, select: { id: true, name: true } }),
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
    pageViews,
    auditLogs,
    warnings,
    memberships: user.memberships.map((membership) => ({ tierId: membership.tierId, name: membership.tier.name, assignedAt: membership.assignedAt, expiresAt: membership.expiresAt })),
    subscriptions: user.subscriptions.map((subscription) => ({ planId: subscription.planId, name: subscription.plan.name })),
    availableMembershipTiers: membershipTiers,
    availableSubscriptionPlans: subscriptionPlans,
  };
}

export type UserAnalyticsProfile = NonNullable<Awaited<ReturnType<typeof getUserAnalyticsProfile>>>;
