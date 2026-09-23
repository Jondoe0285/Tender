import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader, Metric } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

const PERIODS = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  all: { label: 'All time', days: null },
} as const;

type Period = keyof typeof PERIODS;

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CLIENT_RELEASE: 'Quote release fee',
  RETAILER_UNLOCK: 'Tender unlock',
  SPONSORED_PLACEMENT: 'Sponsored placement',
  MEMBERSHIP_TIER: 'Membership',
  INDEPENDENT_REVIEW: 'Enhanced verification',
  DIRECT_CONTACT: 'Direct contact',
  PROFESSIONAL_INTEREST: 'Professional interest',
};

function getPeriodStart(period: Period): Date | undefined {
  const days = PERIODS[period].days;
  if (days === null) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export default async function UserActivityAndPaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const requestedPeriod = (await searchParams).period;
  const period: Period = requestedPeriod && requestedPeriod in PERIODS ? requestedPeriod as Period : '30d';
  const periodStart = getPeriodStart(period);
  const dateFilter = periodStart ? { gte: periodStart } : undefined;
  const [unlocks, quotesProvided, quotesAccepted, payments] = await Promise.all([
    prisma.unlock.count({ where: { retailerId: user.id, ...(dateFilter ? { unlockedAt: dateFilter } : {}) } }),
    prisma.quote.count({ where: { retailerId: user.id, ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
    prisma.quote.count({ where: { retailerId: user.id, status: 'ACCEPTED', ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
    prisma.payment.findMany({
      where: { userId: user.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);
  const metrics = [
    { label: 'Tenders unlocked', value: unlocks },
    { label: 'Quotes provided', value: quotesProvided },
    { label: 'Quotes accepted', value: quotesAccepted },
  ];

  return (
    <AppShell role="retailer" title="Activity and payments">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          description="Buying fees and supplying activity for the selected period, on one account."
          actions={
            <div className="flex flex-wrap gap-2" aria-label="Activity period">
              {(Object.keys(PERIODS) as Period[]).map((key) => (
                <Link
                  key={key}
                  href={`/user/billing?period=${key}`}
                  className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-semibold ${key === period ? 'border-trade-blue bg-trade-blue text-site-white' : 'border-slate-300 bg-white text-concrete-grey hover:border-trade-blue hover:text-foundation-navy'}`}
                >
                  {PERIODS[key].label}
                </Link>
              ))}
            </div>
          }
        />
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
        {payments.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-concrete-grey">
            No payments are recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-concrete-grey">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Total inc. VAT</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 tabular-nums text-concrete-grey">{payment.createdAt.toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-2.5 text-foundation-navy">{PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}</td>
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
