'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { RetailerAnalytics } from '@/server/domain/retailerAnalyticsService';
import type { RetailerAnalyticsSectionKey } from '@/server/domain/platformSettings';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

type Props = {
  data: RetailerAnalytics;
  sections: Record<RetailerAnalyticsSectionKey, boolean>;
};

export function RetailerAnalyticsDashboard({ data, sections }: Props) {
  const strongestCategory = data.categories[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Matched tenders" value={data.totals.matched} hint="Notified opportunities" />
        <Metric label="Unlock rate" value={`${data.rates.unlockRate}%`} hint={`${data.totals.unlocked} unlocked`} />
        <Metric label="Quotes submitted" value={data.totals.quotesSubmitted} hint="After unlock" />
        <Metric label="Quote win rate" value={`${data.rates.winRate}%`} hint={`${data.totals.accepted} accepted`} />
      </div>

      {strongestCategory && (
        <Card className="mb-8 border-l-4 border-l-safety-amber bg-amber-50/40">
          <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Performance insight</p>
          <h2 className="mt-2 font-heading text-lg font-bold text-foundation-navy">
            {strongestCategory.category} is your strongest category with {strongestCategory.matched} matched tender{strongestCategory.matched === 1 ? '' : 's'}.
          </h2>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {sections.RETAILER_ANALYTICS_SECTION_TRENDS && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Trends</h2>
              <p className="mt-1 text-sm text-concrete-grey">Matched tenders and quotes submitted over time.</p>
            </div>
            <div className="h-64">
              {data.monthly.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly}>
                    <CartesianGrid stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="matched" name="Matched" stroke="#1D3D5C" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="quotes" name="Quotes" stroke="#F5A524" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Card>
        )}

        {sections.RETAILER_ANALYTICS_SECTION_QUOTE_VALUE && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Quote value</h2>
              <p className="mt-1 text-sm text-concrete-grey">Value of quotes submitted and awarded.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SubMetric label="Total quoted" value={money.format(data.quoteValue.totalQuotedGbp)} />
              <SubMetric label="Average quote" value={money.format(data.quoteValue.averageQuotedGbp)} />
              <SubMetric label="Total awarded" value={money.format(data.quoteValue.totalAcceptedGbp)} />
              <SubMetric label="Average awarded" value={money.format(data.quoteValue.averageAcceptedGbp)} />
            </div>
          </Card>
        )}

        {sections.RETAILER_ANALYTICS_SECTION_CATEGORY && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Category performance</h2>
              <p className="mt-1 text-sm text-concrete-grey">Where your matched demand and win rate are strongest.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-concrete-grey">
                  <tr><th className="pb-3">Category</th><th className="pb-3">Matched</th><th className="pb-3">Quotes</th><th className="pb-3">Win rate</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.categories.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-concrete-grey">No matched tenders yet.</td></tr>
                  ) : data.categories.map((item) => (
                    <tr key={item.category}>
                      <td className="py-3 font-semibold text-foundation-navy">{item.category}</td>
                      <td className="py-3 text-concrete-grey">{item.matched}</td>
                      <td className="py-3 text-concrete-grey">{item.quotes}</td>
                      <td className="py-3"><StatusBadge status={item.winRate >= 25 ? 'approved' : 'pending'}>{`${item.winRate}%`}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {sections.RETAILER_ANALYTICS_SECTION_REGIONAL && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Regional activity</h2>
              <p className="mt-1 text-sm text-concrete-grey">Locations generating the most matched demand.</p>
            </div>
            <div className="h-64">
              {data.regions.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.regions} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="region" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="matched" name="Matched" fill="#1D3D5C" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </Card>
        )}

        {sections.RETAILER_ANALYTICS_SECTION_RESPONSE_TIME && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Response time</h2>
              <p className="mt-1 text-sm text-concrete-grey">Average time from being matched to submitting a quote.</p>
            </div>
            <p className="font-heading text-4xl font-bold text-foundation-navy">
              {data.responseTime.averageHours === null ? 'No data' : `${data.responseTime.averageHours}h`}
            </p>
            <p className="mt-2 text-sm text-concrete-grey">Faster responses improve Client acceptance rates.</p>
          </Card>
        )}

        {sections.RETAILER_ANALYTICS_SECTION_BENCHMARK && (
          <Card>
            <div className="mb-5">
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Platform benchmark</h2>
              <p className="mt-1 text-sm text-concrete-grey">How your rates compare to the platform average.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <BenchmarkMetric label="Unlock rate" mine={data.rates.unlockRate} platform={data.benchmark.platformUnlockRate} />
              <BenchmarkMetric label="Quote win rate" mine={data.rates.winRate} platform={data.benchmark.platformWinRate} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <Card className="border-l-4 border-l-steel-blue p-5">
      <p className="font-heading text-2xl font-bold text-foundation-navy">{value}</p>
      <p className="mt-2 text-xs font-semibold text-foundation-navy">{label}</p>
      <p className="mt-1 text-xs text-concrete-grey">{hint}</p>
    </Card>
  );
}

function SubMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-heading text-xl font-bold text-foundation-navy">{value}</p>
      <p className="mt-1 text-xs font-medium text-concrete-grey">{label}</p>
    </div>
  );
}

function BenchmarkMetric({ label, mine, platform }: { label: string; mine: number; platform: number }) {
  const ahead = mine >= platform;
  return (
    <div>
      <p className="font-heading text-xl font-bold text-foundation-navy">{mine}%</p>
      <p className="mt-1 text-xs font-medium text-concrete-grey">{label} &middot; platform avg {platform}%</p>
      <StatusBadge status={ahead ? 'approved' : 'pending'}>{ahead ? 'At or above average' : 'Below average'}</StatusBadge>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-concrete-grey">No data for this period.</div>;
}
