import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds, listMatchedSummariesForRetailer } from '@/server/domain/tenderService';
import { WorkQueue, type WorkQueueItem } from '@/components/work/WorkQueue';

export default async function ClientPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
  const [openTenders, awardedCount, matches, unlocks, submittedQuotes] = await Promise.all([
    prisma.tender.findMany({
      where: { clientId: { in: memberIds }, status: 'OPEN' },
      orderBy: { closingDate: 'asc' },
      include: { quotes: { select: { id: true, status: true } } },
    }),
    prisma.quote.count({ where: { tender: { clientId: { in: memberIds } }, status: 'ACCEPTED' } }),
    listMatchedSummariesForRetailer(user.id),
    prisma.unlock.findMany({ where: { retailerId: user.id }, select: { tenderId: true } }),
    prisma.quote.findMany({
      where: { retailerId: user.id, status: 'SUBMITTED' },
      select: { id: true, tenderId: true, tender: { select: { reference: true, subcategory: true, closingDate: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 8,
    }),
  ]);

  const unlockedIds = new Set(unlocks.map((unlock) => unlock.tenderId));
  const quotedTenderIds = new Set(submittedQuotes.map((quote) => quote.tenderId));
  const quotesReceivedCount = openTenders.reduce((total, tender) => total + tender.quotes.length, 0);

  const buyingQueue: WorkQueueItem[] = openTenders.flatMap((tender): WorkQueueItem[] => {
    const hasSubmitted = tender.quotes.some((quote) => quote.status === 'SUBMITTED');
    const hasAccepted = tender.quotes.some((quote) => quote.status === 'ACCEPTED');
    if (hasSubmitted && !hasAccepted) {
      return [{
        href: `/client/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.subcategory,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Review quotes',
        status: 'attention' as const,
      }];
    }
    if (tender.quotes.length === 0) {
      return [{
        href: `/client/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.subcategory,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Waiting for quotes',
        status: 'neutral' as const,
      }];
    }
    return [];
  }).slice(0, 8);

  const supplyingQueue: WorkQueueItem[] = [
    ...matches
      .filter(({ tender, viewedAt }) => !unlockedIds.has(tender.id) && !viewedAt)
      .slice(0, 5)
      .map(({ tender }) => ({
        href: `/retailer/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.category,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'New match',
        status: 'attention' as const,
      })),
    ...matches
      .filter(({ tender }) => unlockedIds.has(tender.id) && !quotedTenderIds.has(tender.id))
      .slice(0, 5)
      .map(({ tender }) => ({
        href: `/retailer/tenders/${tender.id}`,
        reference: tender.reference,
        title: tender.category,
        due: tender.closingDate.toLocaleDateString('en-GB'),
        action: 'Quote unlocked brief',
        status: 'pending' as const,
      })),
    ...submittedQuotes.slice(0, 5).map((quote) => ({
      href: `/retailer/tenders/${quote.tenderId}`,
      reference: quote.tender.reference,
      title: quote.tender.subcategory,
      due: quote.tender.closingDate.toLocaleDateString('en-GB'),
      action: 'Awaiting buyer',
      status: 'neutral' as const,
    })),
  ].slice(0, 8);

  const buyingMetrics = [
    { label: 'Open tenders', value: openTenders.length },
    { label: 'Quotes on open tenders', value: quotesReceivedCount },
    { label: 'Awarded projects', value: awardedCount },
  ];

  return (
    <AppShell role="client" title="Dashboard">
      <div className="mx-auto max-w-4xl">
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-concrete-grey">
          This week: review quotes that are waiting, then quote the matches you have unlocked.
        </p>

        <WorkQueue
          title="This week"
          items={[...buyingQueue, ...supplyingQueue].slice(0, 8)}
          emptyLabel="Nothing waiting on you. Raise a tender or keep your supplying profile current."
          emptyHref="/client/tenders/new"
          emptyAction="Raise a tender"
        />

        <section className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Buying</p>
              <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">Open tenders</h2>
            </div>
            <LinkButton href="/client/tenders/new" size="lg">Create tender</LinkButton>
          </div>

          <div className="mb-6 grid gap-5 sm:grid-cols-3">
            {buyingMetrics.map((metric) => (
              <Card key={metric.label} className="border-l-4 border-l-steel-blue">
                <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
                <p className="mt-2 text-sm font-medium text-concrete-grey">{metric.label}</p>
              </Card>
            ))}
          </div>

          <WorkQueue
            title="Buying queue"
            items={buyingQueue}
            emptyLabel="No open buying work. Raise a specified package to start receiving quotes."
            emptyHref="/client/tenders/new"
            emptyAction="Raise your first tender"
          />
          <p className="mt-3 text-right">
            <Link href="/client/tenders" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">
              View all tenders &rarr;
            </Link>
          </p>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Supplying</p>
              <h2 className="mt-1 font-heading text-xl font-bold text-foundation-navy">Matched demand</h2>
            </div>
            <LinkButton href="/user/opportunities" variant="secondary" size="lg">Opportunities</LinkButton>
          </div>
          <WorkQueue
            title="Supplying queue"
            items={supplyingQueue}
            emptyLabel="No open matches yet. Set services, provisions, and coverage on your profile."
            emptyHref="/user/profile"
            emptyAction="Update supplying profile"
          />
        </section>
      </div>
    </AppShell>
  );
}
