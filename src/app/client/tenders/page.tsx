import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

export default async function MyTendersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
  const tenders = await prisma.tender.findMany({
    where: { clientId: { in: memberIds } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { quotes: true } } },
  });

  return (
    <AppShell role="client" title="My Tenders">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-xl text-sm text-concrete-grey">Every tender raised for your company, in one place.</p>
          <LinkButton href="/client/tenders/new">Create Tender</LinkButton>
        </div>
        {tenders.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-sm text-concrete-grey">No tenders have been raised for this account.</p>
            <LinkButton href="/client/tenders/new" className="mx-auto mt-5">Raise your first tender</LinkButton>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {tenders.map((tender) => (
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
