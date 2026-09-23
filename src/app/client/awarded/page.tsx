import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataCell, DataRow, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';
import { hydrateEnterpriseRecords } from '@/server/domain/enterpriseRecordRepair';
import { buyingTenderPath } from '@/lib/workspace-paths';

export default async function AwardedProjectsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
  await hydrateEnterpriseRecords(memberIds);
  const awards = await prisma.award.findMany({
    where: { tender: { clientId: { in: memberIds } } },
    orderBy: { awardedAt: 'desc' },
    include: {
      project: { select: { name: true } },
      quote: { select: { reference: true, priceGbp: true } },
      tender: { select: { id: true, reference: true, subcategory: true, category: true, location: true } },
    },
  });

  return (
    <AppShell role="client" title="Awarded">
      <div className="mx-auto max-w-6xl">
        <PageHeader description="Awards on the record for your company. Each row is bound to the issued package revision." />
        {awards.length === 0 ? (
          <EmptyState
            title="No awards on the record"
            body="When you accept a quote, the award, purchase order, and frozen package revision appear here."
          />
        ) : (
          <DataTable headers={['Tender', 'Project', 'Package', 'Quote', 'PO', 'Awarded', 'Status']}>
            {awards.map((award) => (
              <DataRow key={award.id}>
                <DataCell strong numeric>
                  <Link href={buyingTenderPath(award.tender.id)} className="hover:text-trade-blue">{award.tender.reference}</Link>
                </DataCell>
                <DataCell>{award.project?.name ?? award.tender.subcategory}</DataCell>
                <DataCell strong>{award.tender.subcategory}</DataCell>
                <DataCell numeric strong>{award.quote.reference} · £{award.quote.priceGbp} excl. VAT</DataCell>
                <DataCell numeric strong>{award.purchaseOrderNumber || '—'}</DataCell>
                <DataCell numeric>{award.awardedAt.toLocaleDateString('en-GB')}</DataCell>
                <DataCell><StatusBadge status="approved">Awarded</StatusBadge></DataCell>
              </DataRow>
            ))}
          </DataTable>
        )}
      </div>
    </AppShell>
  );
}
