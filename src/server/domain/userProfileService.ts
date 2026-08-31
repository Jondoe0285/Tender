import { prisma } from '@/server/data/prisma';

/** Consolidated Super User view: profile fields, login/session analytics, recent pages, and recent actions. */
export async function getUserAnalyticsProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      retailerProfile: true,
      primaryClientCompany: true,
      clientCompanyMembership: { include: { company: true } },
    },
  });
  if (!user) return null;

  const [pageViews, auditLogs] = await Promise.all([
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
  };
}

export type UserAnalyticsProfile = NonNullable<Awaited<ReturnType<typeof getUserAnalyticsProfile>>>;
