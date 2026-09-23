import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LinkButton } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getCompanyMemberIds } from '@/server/domain/tenderService';

export default async function MyTendersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const memberIds = await getCompanyMemberIds(user.id);
  const tenders = await prisma.tender.findMany({
    where: { clientId: { in: memberIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { quotes: true, awards: true, packages: true } },
      project: { select: { name: true } },
    },
  });

  return (
    <AppShell role="client" title="My tenders">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          description="Every package issued for your company, with quote and award counts."
          actions={<LinkButton href="/client/tenders/new">Create tender</LinkButton>}
        />
        {tenders.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-concrete-grey">No tenders have been raised for this account.</p>
            <LinkButton href="/client/tenders/new" className="mx-auto mt-5">Raise your first tender</LinkButton>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5">Package</th>
                  <th className="px-4 py-2.5">Closes</th>
                  <th className="px-4 py-2.5">Quotes</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender) => (
                  <tr key={tender.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">
                      <Link href={`/client/tenders/${tender.id}`} className="hover:text-trade-blue">{tender.reference}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-concrete-grey">{tender.project?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-foundation-navy">{tender.subcategory}</td>
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{tender.closingDate.toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2.5 tabular-nums text-foundation-navy">{tender._count.quotes}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={tender._count.awards > 0 ? 'approved' : tender._count.quotes > 0 ? 'pending' : 'neutral'}>
                        {tender._count.awards > 0 ? 'Awarded' : tender._count.quotes > 0 ? `${tender._count.quotes} quote(s)` : 'Awaiting quotes'}
                      </StatusBadge>
                    </td>
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
