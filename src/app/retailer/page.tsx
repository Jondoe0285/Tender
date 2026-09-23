import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { prisma } from '@/server/data/prisma';
import { getPaymentFeeGbp } from '@/server/domain/platformSettings';
import { WorkQueue, type WorkQueueItem } from '@/components/work/WorkQueue';
import { effectiveLaunchCredits } from '@/lib/launch-credits';

export const dynamic = 'force-dynamic';

export default async function RetailerPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const matches = await listMatchedSummariesForRetailer(user.id);
  const [unlocks, quotes, profile, unlockFeeGbp] = await Promise.all([
    prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
    prisma.quote.findMany({
      where: { retailerId: user.id },
      select: { tenderId: true, status: true, tender: { select: { reference: true, subcategory: true, closingDate: true } } },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.retailerProfile.findUnique({
      where: { userId: user.id },
      select: { launchCreditsLeft: true, launchCreditsExpireAt: true },
    }),
    getPaymentFeeGbp('RETAILER_UNLOCK'),
  ]);
  const unlockedIds = new Set(unlocks.map((unlock) => unlock.tenderId));
  const quotedIds = new Set(quotes.map((quote) => quote.tenderId));
  const newOpportunities = matches.filter(({ tender }) => !unlockedIds.has(tender.id));

  const queue: WorkQueueItem[] = [
    ...matches
      .filter(({ tender, viewedAt }) => !unlockedIds.has(tender.id) && !viewedAt)
      .map(({ tender }) => ({
        href: `/retailer/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.category,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Review new match',
        status: 'attention' as const,
      })),
    ...matches
      .filter(({ tender }) => unlockedIds.has(tender.id) && !quotedIds.has(tender.id))
      .map(({ tender }) => ({
        href: `/retailer/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.category,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Submit quote',
        status: 'pending' as const,
      })),
    ...quotes
      .filter((quote) => quote.status === 'SUBMITTED')
      .slice(0, 5)
      .map((quote) => ({
        href: `/retailer/tenders/${quote.tenderId}`,
        reference: quote.tender.reference,
        title: quote.tender.subcategory,
        due: quote.tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Awaiting award',
        status: 'neutral' as const,
      })),
  ].slice(0, 8);

  const metrics = [
    { label: 'New opportunities', value: newOpportunities.length },
    { label: 'Unlocked tenders', value: unlocks.length },
    { label: 'Submitted quotes', value: quotes.length },
    { label: 'Launch credits left', value: effectiveLaunchCredits(profile?.launchCreditsLeft ?? 0, profile?.launchCreditsExpireAt) },
  ];

  return (
    <AppShell role="retailer" title="Dashboard">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-xl text-base leading-relaxed text-concrete-grey">
            Quote the briefs you have unlocked this week. Contact stays closed until the buyer accepts.
          </p>
          <LinkButton href="/retailer/opportunities" size="lg">Opportunities</LinkButton>
        </div>

        <WorkQueue
          title="This week"
          items={queue}
          emptyLabel="No matched work waiting. Keep provisions and coverage current so specified demand can reach you."
          emptyHref="/user/profile"
          emptyAction="Update supplying profile"
        />

        <div className="mb-10 grid gap-5 sm:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-l-4 border-l-steel-blue">
              <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
              <p className="mt-2 text-sm font-medium text-concrete-grey">{metric.label}</p>
            </Card>
          ))}
        </div>
        {unlockFeeGbp > 0 && (
          <p className="text-xs text-concrete-grey">Unlock fee is £{unlockFeeGbp} excl. VAT unless a launch credit applies.</p>
        )}
      </div>
    </AppShell>
  );
}
