import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

export default async function ClientBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const payments = await prisma.payment.findMany({
    where: { userId: user.id, type: 'CLIENT_RELEASE' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AppShell role="client" title="Activity and payments">
      <div className="mx-auto max-w-6xl">
        <PageHeader description="Accepted quote release fees charged when you accept a supplier quote. Contact release follows confirmed payment." />
        {payments.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-concrete-grey">
            No billing activity is recorded for this account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Fee excl. VAT</th>
                  <th className="px-4 py-2.5">VAT</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{payment.createdAt.toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2.5 text-foundation-navy">Accepted quote release fee</td>
                    <td className="px-4 py-2.5 tabular-nums text-foundation-navy">&pound;{payment.amountGbp.toFixed(2)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">&pound;{payment.vatGbp.toFixed(2)} ({payment.vatPercentage}%)</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-foundation-navy">&pound;{payment.totalAmountGbp.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={payment.status === 'CONFIRMED' ? 'approved' : payment.status === 'FAILED' ? 'attention' : 'pending'}
                      >
                        {payment.status}
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
