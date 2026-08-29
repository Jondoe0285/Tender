import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { estimateDistanceMiles, retailerCoversTenderLocation } from '@/lib/geography';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { OpportunitiesExplorer } from '@/components/retailer/OpportunitiesExplorer';
import type { OpportunityCardData } from '@/components/retailer/TenderOpportunityCard';

export const dynamic = 'force-dynamic';

export default async function NewOpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'RETAILER') redirect('/login');

  const [matches, unlocks, profile, unlockFeeGbp] = await Promise.all([
    listMatchedSummariesForRetailer(user.id),
    prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
    prisma.retailerProfile.findUnique({ where: { userId: user.id }, select: { coverageAreas: true, coverageScope: true, counties: true, regions: true, launchCreditsLeft: true } }),
    getPaymentFeeGbp('RETAILER_UNLOCK'),
  ]);
  const unlockedIds = new Set(unlocks.map((u) => u.tenderId));
  const hasCredits = (profile?.launchCreditsLeft ?? 0) > 0;
  const coverageAreas = profile?.coverageAreas ?? '';

  const opportunities: OpportunityCardData[] = matches
    .filter(({ tender }) => !unlockedIds.has(tender.id))
    .map(({ tender, viewedAt }) => ({
      tenderId: tender.id,
      reference: tender.reference,
      category: tender.category,
      urgency: tender.urgency,
      location: tender.location,
      distanceMiles: estimateDistanceMiles(coverageAreas, tender.location),
      requirements: tender.requirements,
      closingDate: tender.closingDate,
      unlockFeeLabel: hasCredits ? 'Free (launch credit)' : `£${unlockFeeGbp}`,
      unlocked: false,
      isNew: !viewedAt,
      strongMatch: profile != null && retailerCoversTenderLocation(profile, tender.location),
    }));

  return (
    <AppShell role="retailer" title="New Opportunities">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Tenders matched to your categories and coverage areas that remain available to unlock.
          Filter and save searches to quickly spot the opportunities worth unlocking.
        </p>
        <OpportunitiesExplorer opportunities={opportunities} />
      </div>
    </AppShell>
  );
}
