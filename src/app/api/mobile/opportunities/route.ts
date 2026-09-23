import { NextResponse } from 'next/server';
import { requireRole } from '@/server/auth/session';
import { toErrorResponse } from '@/server/http/errors';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { getTenderUnlockFeeGbp } from '@/server/domain/platformSettings';
import { effectiveLaunchCredits } from '@/lib/launch-credits';

export async function GET() {
  try {
    const user = await requireRole('USER');
    const [matches, unlocks, profile] = await Promise.all([
      listMatchedSummariesForRetailer(user.id),
      prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
      prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { launchCreditsLeft: true, launchCreditsExpireAt: true } }),
    ]);
    const unlockedTenderIds = new Set(unlocks.map((unlock) => unlock.tenderId));
    const opportunities = await Promise.all(matches
      .filter(({ tender }) => !unlockedTenderIds.has(tender.id))
      .map(async ({ tender, viewedAt }) => ({
        id: tender.id,
        reference: tender.reference,
        category: tender.category,
        location: tender.location,
        urgency: tender.urgency,
        closingDate: tender.closingDate,
        requirements: tender.requirements,
        isNew: !viewedAt,
        unlockFeeGbp: effectiveLaunchCredits(profile?.launchCreditsLeft ?? 0, profile?.launchCreditsExpireAt) > 0 ? 0 : await getTenderUnlockFeeGbp(tender.id, tender.packageCategories),
      })));
    return NextResponse.json({
      opportunities,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}