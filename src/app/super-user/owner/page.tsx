import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { OwnerConsolePanel } from '@/components/admin/OwnerConsolePanel';

export default async function OwnerConsolePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');
  if (user.isAccountant) redirect('/super-user/accounting');
  if (!user.isOwner) redirect('/login');

  const superUsers = await prisma.user.findMany({
    where: { role: 'SUPER_USER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, contactName: true, contactPhone: true, isOwner: true, suspended: true },
  });

  return (
    <AppShell role="super-user" title="Owner Console">
      <OwnerConsolePanel initialSuperUsers={superUsers} currentUserId={user.id} />
    </AppShell>
  );
}
