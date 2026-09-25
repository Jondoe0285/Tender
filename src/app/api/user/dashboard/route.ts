import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds, listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { hydrateEnterpriseRecords } from '@/server/domain/enterpriseRecordRepair';
import { getBuyerCapabilities } from '@/server/domain/workspacePermissions';

type QueueItem = {
  tenderId: string;
  reference: string;
  title: string;
  due: string;
  action: string;
  status: 'attention' | 'pending' | 'neutral';
};

export async function GET() {
  try {
    const user = await requireRole('USER');
    const memberIds = await getCompanyMemberIds(user.id);
    await hydrateEnterpriseRecords(memberIds);
    const [openTenders, awardedCount, quotesReceivedCount, quotesToReview, matches, unlocks, submittedQuotes, capabilities] = await Promise.all([
      prisma.tender.findMany({
        where: { clientId: { in: memberIds }, status: 'OPEN' },
        orderBy: { closingDate: 'asc' },
        include: { quotes: { select: { id: true, status: true } }, _count: { select: { awards: true } } },
      }),
      prisma.award.count({ where: { tender: { clientId: { in: memberIds } } } }),
      prisma.quote.count({ where: { tender: { clientId: { in: memberIds } } } }),
      prisma.tender.count({
        where: {
          clientId: { in: memberIds },
          status: 'OPEN',
          quotes: { some: { status: 'SUBMITTED' } },
          awards: { none: {} },
        },
      }),
      listMatchedSummariesForRetailer(user.id),
      prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
      prisma.quote.findMany({
        where: { retailerId: user.id, status: 'SUBMITTED' },
        select: { id: true, tenderId: true, tender: { select: { reference: true, subcategory: true, closingDate: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 8,
      }),
      getBuyerCapabilities(user.id),
    ]);

    const unlockedIds = new Set(unlocks.map((unlock) => unlock.tenderId));
    const quotedTenderIds = new Set(submittedQuotes.map((quote) => quote.tenderId));

    const buyingQueue: QueueItem[] = openTenders.flatMap((tender): QueueItem[] => {
      const hasSubmitted = tender.quotes.some((quote) => quote.status === 'SUBMITTED');
      const awarded = tender._count.awards > 0;
      if (hasSubmitted && !awarded) {
        return [{
          tenderId: tender.id,
          reference: tender.reference,
          title: tender.subcategory,
          due: tender.closingDate.toISOString(),
          action: 'Review quotes',
          status: 'attention',
        }];
      }
      if (tender.quotes.length === 0) {
        return [{
          tenderId: tender.id,
          reference: tender.reference,
          title: tender.subcategory,
          due: tender.closingDate.toISOString(),
          action: 'Waiting for quotes',
          status: 'neutral',
        }];
      }
      return [];
    }).slice(0, 8);

    const supplyingQueue: QueueItem[] = [
      ...matches
        .filter(({ tender, viewedAt }) => !unlockedIds.has(tender.id) && !viewedAt)
        .slice(0, 5)
        .map(({ tender }) => ({
          tenderId: tender.id,
          reference: tender.reference,
          title: tender.category,
          due: tender.closingDate.toISOString(),
          action: 'New match',
          status: 'attention' as const,
        })),
      ...matches
        .filter(({ tender }) => unlockedIds.has(tender.id) && !quotedTenderIds.has(tender.id))
        .slice(0, 5)
        .map(({ tender }) => ({
          tenderId: tender.id,
          reference: tender.reference,
          title: tender.category,
          due: tender.closingDate.toISOString(),
          action: 'Quote unlocked brief',
          status: 'pending' as const,
        })),
      ...submittedQuotes.slice(0, 5).map((quote) => ({
        tenderId: quote.tenderId,
        reference: quote.tender.reference,
        title: quote.tender.subcategory,
        due: quote.tender.closingDate.toISOString(),
        action: 'Awaiting buyer',
        status: 'neutral' as const,
      })),
    ].slice(0, 8);

    return NextResponse.json({
      capabilities,
      metrics: {
        openTenders: openTenders.length,
        quotesToReview,
        awardedCount,
        quotesReceivedCount,
      },
      buyingQueue,
      supplyingQueue,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
