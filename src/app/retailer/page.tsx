import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { estimateDistanceMiles } from '@/lib/geography';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { TenderOpportunityCard, type OpportunityCardData } from '@/components/retailer/TenderOpportunityCard';

export const dynamic = 'force-dynamic';

export default async function RetailerPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'PROVIDER') redirect('/login');

  const matches = await listMatchedSummariesForRetailer(user.id);
  const [unlockCount, quoteCount, profile, unlockFeeGbp] = await Promise.all([
    prisma.unlock.count({ where: { retailerId: user.id } }),
    prisma.quote.count({ where: { retailerId: user.id } }),
    prisma.retailerProfile.findUnique({
      where: { userId: user.id },
      select: {
        categories: true,
        launchCreditsLeft: true,
        coverageAreas: true,
        coverageScope: true,
        counties: true,
        regions: true,
      },
    }),
    getPaymentFeeGbp('RETAILER_UNLOCK'),
  ]);
  const unlockedIds = new Set(
    (await prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } })).map((u) => u.tenderId)
  );
  const newOpportunities = matches.filter(({ tender }) => !unlockedIds.has(tender.id));
  const hasCredits = (profile?.launchCreditsLeft ?? 0) > 0;
  const coverageAreas = profile?.coverageAreas ?? '';

  const metrics = [
    { label: 'New opportunities', value: newOpportunities.length },
    { label: 'Unlocked tenders', value: unlockCount },
    { label: 'Submitted quotes', value: quoteCount },
    { label: 'Launch credits left', value: profile?.launchCreditsLeft ?? 0 },
  ];

  const latest: OpportunityCardData[] = matches
    .map(({ tender, viewedAt }) => {
      const unlocked = unlockedIds.has(tender.id);
      const categoryMatch = tender.categoryMatch;
      const locationMatch = tender.locationMatch;
      const strongMatch = categoryMatch && locationMatch;

      return {
        tenderId: tender.id,
        reference: tender.reference,
        category: tender.category,
        urgency: tender.urgency,
        location: tender.location,
        distanceMiles: estimateDistanceMiles(coverageAreas, tender.location),
        requirements: tender.requirements,
        closingDate: tender.closingDate,
        unlockFeeLabel: unlocked ? 'Unlocked' : hasCredits ? 'Free (launch credit)' : `£${unlockFeeGbp} excl. VAT`,
        unlocked,
        isNew: !viewedAt,
        strongMatch,
        categoryMatch,
        locationMatch,
      };
    })
    .sort((a, b) => {
      if (a.strongMatch !== b.strongMatch) return Number(b.strongMatch) - Number(a.strongMatch);
      if ((a.categoryMatch ?? false) !== (b.categoryMatch ?? false)) return Number(b.categoryMatch) - Number(a.categoryMatch);
      if (a.isNew !== b.isNew) return Number(b.isNew) - Number(a.isNew);
      return new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime();
    })
    .slice(0, 5);

  return (
    <AppShell role="retailer" title="Dashboard">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-xl text-base leading-relaxed text-concrete-grey">
            Matched tenders for materials, waste services, and plant hire. Keep your categories and
            coverage areas current to improve every match.
          </p>
          <LinkButton href="/retailer/opportunities" size="lg">New Opportunities</LinkButton>
        </div>

        <div className="mb-10 grid gap-5 sm:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-l-4 border-l-steel-blue">
              <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
              <p className="mt-2 text-sm font-medium text-concrete-grey">{metric.label}</p>
            </Card>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-xl font-bold text-foundation-navy">Latest matched tenders</h2>
          <a href="/retailer/opportunities" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">
            View all opportunities &rarr;
          </a>
        </div>
        {latest.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-sm text-concrete-grey">
              No matched tenders are available. Keep your categories and coverage areas up to date to improve matching.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {latest.map((item) => (
              <TenderOpportunityCard key={item.tenderId} data={item} href={`/retailer/tenders/${item.tenderId}`} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
