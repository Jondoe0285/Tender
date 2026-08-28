import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { AccountantManagementPanel } from '@/components/admin/AccountantManagementPanel';

export default async function AccountantManagementPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');

  const accountants = await prisma.user.findMany({
    where: { role: 'SUPER_USER', isAccountant: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, contactName: true, contactPhone: true, suspended: true },
  });

  return (
    <AppShell role="super-user" title="Accountant Management">
      <AccountantManagementPanel initialAccountants={accountants} />
    </AppShell>
  );
}
