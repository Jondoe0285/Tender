import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getComplianceOverview } from '@/server/domain/complianceMonitoringService';

export default async function TenderManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const overview = await getComplianceOverview();
  const highRiskTenderIds = overview.flags
    .filter((flag) => flag.severity === 'HIGH' && flag.targetType === 'Tender')
    .map((flag) => flag.targetId);
  const tenders = highRiskTenderIds.length === 0 ? [] : await prisma.tender.findMany({
    where: { id: { in: highRiskTenderIds } },
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { contactName: true } }, _count: { select: { quotes: true, matches: true } } },
  });

  return (
    <AppShell role="super-user" title="Tender Management">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">High-risk tenders detected in the current {overview.windowDays}-day compliance window.</p>
        {tenders.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No high-risk tenders are currently detected.</Card>
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
                <div className="flex items-center gap-3"><StatusBadge status={tender.status === 'OPEN' ? 'pending' : 'neutral'}>{tender.status}</StatusBadge><LinkButton href={`/super-user/tenders/${encodeURIComponent(tender.id)}`} variant="secondary">Review</LinkButton></div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
