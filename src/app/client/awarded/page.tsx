import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

export default async function AwardedProjectsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
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
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-concrete-grey">
            No awards are recorded for this account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Tender</th>
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5">Package</th>
                  <th className="px-4 py-2.5">Quote</th>
                  <th className="px-4 py-2.5">PO</th>
                  <th className="px-4 py-2.5">Awarded</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {awards.map((award) => (
                  <tr key={award.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">
                      <Link href={`/client/tenders/${award.tender.id}`} className="hover:text-trade-blue">{award.tender.reference}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-concrete-grey">{award.project?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-foundation-navy">{award.tender.subcategory}</td>
                    <td className="px-4 py-2.5 tabular-nums text-foundation-navy">{award.quote.reference} · £{award.quote.priceGbp} excl. VAT</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">{award.purchaseOrderNumber || '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{award.awardedAt.toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2.5"><StatusBadge status="approved">Awarded</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
