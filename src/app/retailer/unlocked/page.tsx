import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function UnlockedTendersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const unlocks = await prisma.unlock.findMany({
    where: { retailerId: user.id },
    orderBy: { unlockedAt: 'desc' },
    include: {
      tender: {
        select: { id: true, reference: true, category: true, subcategory: true, location: true, closingDate: true },
      },
    },
  });

  return (
    <AppShell role="retailer" title="Unlocked tenders">
      <div className="mx-auto max-w-6xl">
        <PageHeader description="Tenders you have unlocked. Full specification is available to quote against." />
        {unlocks.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-concrete-grey">
            No tenders have been unlocked for this account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5">Lane</th>
                  <th className="px-4 py-2.5">Package</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Closes</th>
                  <th className="px-4 py-2.5">Unlock</th>
                </tr>
              </thead>
              <tbody>
                {unlocks.map((unlock) => (
                  <tr key={unlock.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">
                      <Link href={`/retailer/tenders/${unlock.tender.id}`} className="hover:text-trade-blue">{unlock.tender.reference}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-concrete-grey">{unlock.tender.category}</td>
                    <td className="px-4 py-2.5 text-foundation-navy">{unlock.tender.subcategory}</td>
                    <td className="px-4 py-2.5 text-concrete-grey">{unlock.tender.location}</td>
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{unlock.tender.closingDate.toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status="approved">{unlock.method === 'CREDIT' ? 'Credit' : 'Paid'}</StatusBadge>
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
