import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">
          Buying fees and supplying activity for the selected period, on one account.
        </p>
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Activity period">
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <Link
              key={key}
              href={`/user/billing?period=${key}`}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${key === period ? 'border-trade-blue bg-trade-blue text-site-white' : 'border-slate-300 bg-white text-concrete-grey hover:border-trade-blue hover:text-foundation-navy'}`}
            >
              {PERIODS[key].label}
            </Link>
          ))}
        </div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foundation-navy">Supplying</h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-l-4 border-l-steel-blue">
              <p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p>
              <p className="mt-2 text-sm font-semibold text-concrete-grey">{metric.label}</p>
            </Card>
          ))}
        </div>
        <h2 className="mb-3 font-heading text-lg font-bold text-foundation-navy">Payments</h2>
        {payments.length === 0 ? (
          <Card className="py-16 text-center text-sm text-concrete-grey">No payments are recorded for this period.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                <div>
                  <p className="font-heading text-base font-bold text-foundation-navy">&pound;{payment.totalAmountGbp.toFixed(2)} inc. VAT</p>
                  <p className="mt-1 text-sm text-concrete-grey">
                    {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type} &middot; {payment.createdAt.toLocaleDateString('en-GB')}
                  </p>
                </div>
                <StatusBadge
                  status={payment.status === 'CONFIRMED' ? 'approved' : payment.status === 'FAILED' ? 'attention' : 'pending'}
                >
                  {payment.status}
                </StatusBadge>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
