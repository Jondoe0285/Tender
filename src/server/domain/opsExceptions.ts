import { prisma } from '@/server/data/prisma';
import { UNLOCK_HARVEST_CAP, UNLOCK_HARVEST_WINDOW_DAYS, harvestUnlockCount } from '@/lib/harvest';

export async function getOpsExceptions() {
  const since = new Date(Date.now() - UNLOCK_HARVEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const closingSoon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const [failedPayments, pendingVerification, closingTenders, recentUnlocks] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, type: true, amountGbp: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.retailerProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      orderBy: { verificationRequestedAt: 'desc' },
      take: 8,
      select: { userId: true, companyName: true, verificationRequestedAt: true },
    }),
    prisma.tender.findMany({
      where: { status: 'OPEN', closingDate: { lte: closingSoon, gte: new Date() } },
      orderBy: { closingDate: 'asc' },
      take: 8,
      select: { id: true, reference: true, closingDate: true },
    }),
    prisma.unlock.findMany({
      where: { unlockedAt: { gte: since } },
      select: { tenderId: true, retailerId: true },
    }),
  ]);

  const retailerIds = [...new Set(recentUnlocks.map((unlock) => unlock.retailerId))];
  const quotes = retailerIds.length === 0
    ? []
    : await prisma.quote.findMany({
      where: { retailerId: { in: retailerIds }, tenderId: { in: recentUnlocks.map((unlock) => unlock.tenderId) } },
      select: { retailerId: true, tenderId: true },
    });
  const harvestFlags = (await Promise.all(retailerIds.map(async (retailerId) => {
    const unlocks = recentUnlocks.filter((unlock) => unlock.retailerId === retailerId);
    const quoted = quotes.filter((quote) => quote.retailerId === retailerId);
    const harvestCount = harvestUnlockCount(unlocks, quoted);
    if (harvestCount < UNLOCK_HARVEST_CAP) return null;
    const user = await prisma.user.findUnique({ where: { id: retailerId }, select: { email: true } });
    return { retailerId, email: user?.email ?? retailerId, harvestCount };
  }))).filter((row): row is { retailerId: string; email: string; harvestCount: number } => row !== null);

  return {
    failedPayments,
    pendingVerification,
    closingTenders,
    harvestFlags,
  };
}
