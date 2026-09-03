import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { ExecutiveDashboard } from '@/components/analytics/ExecutiveDashboard';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';
import { getAnalytics, parseAnalyticsFilters } from '@/server/domain/analyticsService';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AccountingSpacePage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_USER') redirect('/login');

  const [payments, analytics] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { contactName: true, email: true } } },
    }),
    getAnalytics(parseAnalyticsFilters(searchParams ?? {})),
  ]);

  return (
    <AppShell role="super-user" title="Accounting Space">
      <div className="mx-auto max-w-6xl space-y-10">
        <p className="max-w-2xl text-sm text-concrete-grey">
          Receipts, invoices, and platform performance for accounting and reporting purposes. This space has no access to Super User settings, users, or platform configuration.
        </p>

        <section>
          <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Receipts and invoices</h2>
          {payments.length === 0 ? (
            <Card className="py-16 text-center text-sm text-concrete-grey">No payment activity is recorded.</Card>
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-steel-blue">
                      {payment.type === 'RETAILER_UNLOCK' ? 'Provider Unlock Fee' : payment.type === 'CLIENT_RELEASE' ? 'Contractor Release Fee' : payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored Placement Fee' : 'Membership Tier Fee'}
                    </p>
                    <h3 className="font-heading text-base font-bold text-foundation-navy">&pound;{payment.totalAmountGbp.toFixed(2)} inc. VAT</h3>
                    <p className="mt-1 text-sm text-concrete-grey">Fee: &pound;{payment.amountGbp.toFixed(2)} excl. VAT &middot; VAT: &pound;{payment.vatGbp.toFixed(2)} ({payment.vatPercentage}%)</p>
                    <p className="mt-1 text-sm text-concrete-grey">
                      {payment.user.contactName} ({payment.user.email}) &middot; {payment.createdAt.toLocaleDateString('en-GB')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {payment.stripeReceiptUrl && (
                        <a href={payment.stripeReceiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-steel-blue hover:underline">Receipt</a>
                      )}
                      {payment.accountingRecordPath && (
                        <a href={payment.accountingRecordPath} target="_blank" rel="noreferrer" className="font-semibold text-steel-blue hover:underline">Invoice record</a>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={payment.status === 'CONFIRMED' ? 'approved' : payment.status === 'FAILED' ? 'attention' : 'pending'}>
                    {payment.status}
                  </StatusBadge>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-heading text-lg font-bold text-foundation-navy">Performance reporting</h2>
          <ExecutiveDashboard data={analytics} />
        </section>
      </div>
    </AppShell>
  );
}
