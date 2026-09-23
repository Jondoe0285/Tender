import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader, Metric } from '@/components/ui/PageHeader';
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
    prisma.award.count({ where: { tender: { clientId: { in: memberIds } } } }),
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
  const quotesToReview = openTenders.filter((tender) => tender.quotes.some((quote) => quote.status === 'SUBMITTED') && !tender.quotes.some((quote) => quote.status === 'ACCEPTED')).length;

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

  return (
    <AppShell role="client" title="Dashboard">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          kicker="This week"
          description="Review quotes that are waiting, then quote the matches you have unlocked."
          actions={<LinkButton href="/client/tenders/new">Create tender</LinkButton>}
        />

        <div className="mb-8 grid gap-3 sm:grid-cols-4">
          <Metric label="Open tenders" value={openTenders.length} />
          <Metric label="Quotes to review" value={quotesToReview} />
          <Metric label="Quotes received" value={quotesReceivedCount} />
          <Metric label="Awards on record" value={awardedCount} />
        </div>

        <WorkQueue
          title="This week"
          items={[...buyingQueue, ...supplyingQueue].slice(0, 8)}
          emptyLabel="Nothing waiting on you. Raise a tender or keep your supplying profile current."
          emptyHref="/client/tenders/new"
          emptyAction="Raise a tender"
        />

        <section className="mb-10">
          <PageHeader
            kicker="Buying"
            title="Open tenders"
            actions={<Link href="/client/tenders" className="text-sm font-semibold text-trade-blue hover:text-foundation-navy">View all tenders</Link>}
          />
          <WorkQueue
            title="Buying queue"
            items={buyingQueue}
            emptyLabel="No open buying work. Raise a specified package to start receiving quotes."
            emptyHref="/client/tenders/new"
            emptyAction="Raise your first tender"
          />
        </section>

        <section>
          <PageHeader
            kicker="Supplying"
            title="Matched demand"
            actions={<LinkButton href="/user/opportunities" variant="secondary">Opportunities</LinkButton>}
          />
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
