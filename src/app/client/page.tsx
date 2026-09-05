import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CONTRACTOR') redirect('/login');

  const [openCount, quotesReceivedCount, awardedCount, recentTenders] = await Promise.all([
    prisma.tender.count({ where: { clientId: user.id, status: 'OPEN' } }),
    prisma.quote.count({ where: { tender: { clientId: user.id } } }),
    prisma.quote.count({ where: { tender: { clientId: user.id }, status: 'ACCEPTED' } }),
    prisma.tender.findMany({
      where: { clientId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { quotes: true } } },
    }),
  ]);

  const metrics = [
    { label: 'Open tenders', value: openCount },
    { label: 'Quotes received', value: quotesReceivedCount },
    { label: 'Awarded projects', value: awardedCount },
  ];

  return (
    <AppShell role="client" title="Dashboard">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-xl text-base leading-relaxed text-concrete-grey">
            Raise a tender for materials, waste services, or plant hire, then compare Provider quotes here.
          </p>
          <LinkButton href="/client/tenders/new" size="lg">Create Tender</LinkButton>
        </div>

        <div className="mb-10 grid gap-5 sm:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-l-4 border-l-steel-blue">
              <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
              <p className="mt-2 text-sm font-medium text-concrete-grey">{metric.label}</p>
            </Card>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-xl font-bold text-foundation-navy">Recent tenders</h2>
          <Link href="/client/tenders" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">
            View all tenders &rarr;
          </Link>
        </div>
        {recentTenders.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-sm text-concrete-grey">No tenders have been raised for this account.</p>
            <LinkButton href="/client/tenders/new" className="mx-auto mt-5">Raise your first tender</LinkButton>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {recentTenders.map((tender) => (
              <a key={tender.id} href={`/client/tenders/${tender.id}`} className="block">
                <Card interactive className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-steel-blue">
                      {tender.category} &middot; {tender.reference}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-foundation-navy">{tender.subcategory}</h3>
                    <p className="mt-1 text-sm text-concrete-grey">
                      Closes {tender.closingDate.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <StatusBadge status={tender._count.quotes > 0 ? 'approved' : 'pending'}>
                    {tender._count.quotes > 0 ? `${tender._count.quotes} quote(s) received` : 'Awaiting quotes'}
                  </StatusBadge>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
