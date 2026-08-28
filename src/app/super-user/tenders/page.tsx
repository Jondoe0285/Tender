import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function TenderManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const tenders = await prisma.tender.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { client: { select: { contactName: true } }, _count: { select: { quotes: true, matches: true } } },
  });

  return (
    <AppShell role="super-user" title="Tender Management">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">All tenders raised on the platform, most recent first.</p>
        {tenders.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No tenders are recorded on the platform.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {tenders.map((tender) => (
              <div key={tender.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">
                    {tender.reference} &middot; {tender.category}
                  </p>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">{tender.subcategory}</h3>
                  <p className="mt-1 text-sm text-concrete-grey">
                    Client: {tender.client.contactName} &middot; {tender._count.matches} matched &middot;{' '}
                    {tender._count.quotes} quote(s)
                  </p>
                </div>
                <StatusBadge status={tender.status === 'OPEN' ? 'pending' : 'neutral'}>{tender.status}</StatusBadge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
