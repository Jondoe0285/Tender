import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AccountManagementTable } from '@/components/admin/AccountManagementTable';
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
      <p className="mb-6 max-w-xl text-sm text-concrete-grey">Registered Retailer accounts and their activity.</p>
      <AccountManagementTable
        role="RETAILER"
        rows={retailers.map((retailer) => ({
          id: retailer.id,
          email: retailer.email,
          contactName: retailer.contactName,
          companyName: retailer.retailerProfile?.companyName ?? retailer.contactName,
          categories: retailer.retailerProfile?.categories ?? undefined,
          suspended: retailer.suspended,
          unlocks: retailer._count.unlocks,
          quotes: retailer._count.quotes,
          launchCreditsLeft: retailer.retailerProfile?.launchCreditsLeft ?? 0,
        }))}
      />
    </AppShell>
  );
}
