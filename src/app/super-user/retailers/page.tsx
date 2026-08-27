import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function RetailerManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  const retailers = await prisma.user.findMany({
    where: { role: 'RETAILER' },
    orderBy: { createdAt: 'desc' },
    include: { retailerProfile: true, _count: { select: { unlocks: true, quotes: true } } },
  });

  return (
    <AppShell role="super-user" title="Retailer Management">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">Registered Retailer accounts and their activity.</p>
        {retailers.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No Retailer accounts are registered.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {retailers.map((retailer) => (
              <div key={retailer.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">
                    {retailer.retailerProfile?.companyName ?? retailer.contactName}
                  </h3>
                  <p className="mt-1 text-sm text-concrete-grey">
                    {retailer.email} &middot; {retailer.retailerProfile?.categories ?? '—'}
                  </p>
                  <p className="mt-1 text-sm text-concrete-grey">
                    {retailer._count.unlocks} unlock(s) &middot; {retailer._count.quotes} quote(s) &middot;{' '}
                    {retailer.retailerProfile?.launchCreditsLeft ?? 0} credits left
                  </p>
                </div>
                <StatusBadge status={retailer.suspended ? 'attention' : 'approved'}>
                  {retailer.suspended ? 'Suspended' : 'Active'}
                </StatusBadge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
