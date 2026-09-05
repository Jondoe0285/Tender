import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const [matches, unlocks, profile, unlockFeeGbp] = await Promise.all([
      listMatchedSummariesForRetailer(user.id),
      prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
      prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { launchCreditsLeft: true } }),
      getPaymentFeeGbp('RETAILER_UNLOCK'),
    ]);
    const unlockedTenderIds = new Set(unlocks.map((unlock) => unlock.tenderId));
    return NextResponse.json({
      opportunities: matches
        .filter(({ tender }) => !unlockedTenderIds.has(tender.id))
        .map(({ tender, viewedAt }) => ({
          id: tender.id,
          reference: tender.reference,
          category: tender.category,
          location: tender.location,
          urgency: tender.urgency,
          closingDate: tender.closingDate,
          requirements: tender.requirements,
          isNew: !viewedAt,
          unlockFeeGbp: (profile?.launchCreditsLeft ?? 0) > 0 ? 0 : unlockFeeGbp,
        })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}