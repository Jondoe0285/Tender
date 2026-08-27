import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tenders: true } } },
  });

  return (
    <AppShell role="super-user" title="Client Management">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">Registered Client accounts and their tender activity.</p>
        {clients.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No Client accounts are registered.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {clients.map((client) => (
              <div key={client.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <h3 className="font-heading text-base font-bold text-foundation-navy">{client.contactName}</h3>
                  <p className="mt-1 text-sm text-concrete-grey">
                    {client.email} &middot; {client._count.tenders} tender(s) raised
                  </p>
                </div>
                <StatusBadge status={client.suspended ? 'attention' : 'approved'}>
                  {client.suspended ? 'Suspended' : 'Active'}
                </StatusBadge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
