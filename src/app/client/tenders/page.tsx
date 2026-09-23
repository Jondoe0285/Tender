import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataCell, DataRow, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';
import { hydrateEnterpriseRecords } from '@/server/domain/enterpriseRecordRepair';
import { getBuyerCapabilities } from '@/server/domain/workspacePermissions';
import { buyingTenderNewPath, buyingTenderPath } from '@/lib/workspace-paths';

export default async function MyTendersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
  await hydrateEnterpriseRecords(memberIds);
  const [tenders, capabilities] = await Promise.all([
    prisma.tender.findMany({
      where: { clientId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { quotes: true, awards: true, packages: true } },
        project: { select: { name: true } },
      },
    }),
    getBuyerCapabilities(user.id),
  ]);

  return (
    <AppShell role="client" title="My tenders">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          description="Every package issued for your company, with quote and award counts."
          actions={capabilities.canRaiseTender ? <LinkButton href={buyingTenderNewPath()}>Create tender</LinkButton> : undefined}
        />
        {tenders.length === 0 ? (
          <EmptyState
            title="No tenders yet"
            body={capabilities.canRaiseTender ? 'Raise a specified package to start receiving comparable quotes. The first tender is the fastest way to see matching suppliers.' : 'No packages have been issued yet. A Buyer or QS / estimator on this organisation can raise a tender.'}
            action={capabilities.canRaiseTender ? <LinkButton href={buyingTenderNewPath()}>Raise your first tender</LinkButton> : undefined}
          />
        ) : (
          <DataTable headers={['Reference', 'Project', 'Package', 'Closes', 'Quotes', 'Status']}>
            {tenders.map((tender) => (
              <DataRow key={tender.id}>
                <DataCell strong numeric>
                  <Link href={buyingTenderPath(tender.id)} className="hover:text-trade-blue">{tender.reference}</Link>
                </DataCell>
                <DataCell>{tender.project?.name ?? tender.subcategory}</DataCell>
                <DataCell strong>{tender.subcategory}</DataCell>
                <DataCell numeric>{tender.closingDate.toLocaleDateString('en-GB')}</DataCell>
                <DataCell numeric strong>{tender._count.quotes}</DataCell>
                <DataCell>
                  <StatusBadge status={tender._count.awards > 0 ? 'approved' : tender._count.quotes > 0 ? 'pending' : 'neutral'}>
                    {tender._count.awards > 0 ? 'Awarded' : tender._count.quotes === 1 ? '1 quote' : tender._count.quotes > 1 ? `${tender._count.quotes} quotes` : 'Awaiting quotes'}
                  </StatusBadge>
                </DataCell>
              </DataRow>
            ))}
          </DataTable>
        )}
      </div>
    </AppShell>
  );
}
