import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AccountManagementTable } from '@/components/admin/AccountManagementTable';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tenders: true } } },
  });

  return (
    <AppShell role="super-user" title="Client Management">
      <p className="mb-6 max-w-xl text-sm text-concrete-grey">Registered Client accounts and their tender activity.</p>
      <AccountManagementTable
        role="CLIENT"
        rows={clients.map((client) => ({
          id: client.id,
          email: client.email,
          contactName: client.contactName,
          suspended: client.suspended,
          tenders: client._count.tenders,
        }))}
      />
    </AppShell>
  );
}
