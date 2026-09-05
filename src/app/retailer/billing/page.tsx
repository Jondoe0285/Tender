import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/data/prisma';

const PERIODS = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  all: { label: 'All time', days: null },
} as const;

type Period = keyof typeof PERIODS;

function getPeriodStart(period: Period): Date | undefined {
  const days = PERIODS[period].days;
  if (days === null) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export default async function UserActivityHistoryPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'USER') redirect('/login');

  const requestedPeriod = (await searchParams).period;
  const period: Period = requestedPeriod && requestedPeriod in PERIODS ? requestedPeriod as Period : '30d';
  const periodStart = getPeriodStart(period);
  const dateFilter = periodStart ? { gte: periodStart } : undefined;
  const [unlocks, quotesProvided, quotesAccepted] = await Promise.all([
    prisma.unlock.count({ where: { retailerId: user.id, ...(dateFilter ? { unlockedAt: dateFilter } : {}) } }),
    prisma.quote.count({ where: { retailerId: user.id, ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
    prisma.quote.count({ where: { retailerId: user.id, status: 'ACCEPTED', ...(dateFilter ? { submittedAt: dateFilter } : {}) } }),
  ]);
  const metrics = [
    { label: 'Tenders unlocked', value: unlocks },
    { label: 'Quotes provided', value: quotesProvided },
    { label: 'Quotes accepted', value: quotesAccepted },
  ];

  return (
    <AppShell role="retailer" title="Activity History">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 max-w-xl text-sm text-concrete-grey">Tender activity for your selected period.</p>
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Activity period">
          {(Object.keys(PERIODS) as Period[]).map((key) => <Link key={key} href={`/user/billing?period=${key}`} className={`rounded-md border px-3 py-2 text-sm font-semibold ${key === period ? 'border-steel-blue bg-steel-blue text-site-white' : 'border-slate-300 bg-white text-concrete-grey hover:border-steel-blue hover:text-foundation-navy'}`}>{PERIODS[key].label}</Link>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => <Card key={metric.label} className="border-l-4 border-l-steel-blue"><p className="font-heading text-4xl font-bold text-foundation-navy">{metric.value}</p><p className="mt-2 text-sm font-semibold text-concrete-grey">{metric.label}</p></Card>)}
        </div>
      </div>
    </AppShell>
  );
}
