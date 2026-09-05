'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CATEGORIES } from '@/lib/categories';

type AnalyticsData = Awaited<ReturnType<typeof import('@/server/domain/analyticsService').getAnalytics>>;

type Props = { data: AnalyticsData };

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

export function ExecutiveDashboard({ data }: Props) {
  const strongestCategory = data.categories[0];
  const bestConversionCategory = [...data.categories].sort((a, b) => b.acceptanceRate - a.acceptanceRate)[0];
  const strongestRegion = data.regions[0];
  const insight = data.totals.tenderVolume === 0
    ? 'No activity matches the selected filters.'
    : strongestCategory && strongestCategory.tenders > 0
      ? `${strongestCategory.category} is driving the most tender demand with ${strongestCategory.tenders} tender${strongestCategory.tenders === 1 ? '' : 's'}.`
      : 'Review category and regional performance to identify where supply coverage can improve.';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-steel-blue">Executive overview</p>
          <p className="max-w-2xl text-base leading-relaxed text-concrete-grey">
            A decision view of marketplace demand, supply engagement, quote conversion, and fee revenue.
          </p>
        </div>
        <a
          href={buildExportUrl(data.filters)}
          className="inline-flex min-h-11 items-center rounded-lg border border-steel-blue/40 bg-white px-4 text-sm font-semibold text-steel-blue shadow-soft hover:border-steel-blue hover:bg-steel-blue/5"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="mb-8 grid gap-4 rounded-card border border-slate-200 bg-white p-5 shadow-soft sm:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Contractor
          <input name="client" defaultValue={data.filters.client ?? ''} placeholder="Name or email" className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Provider
          <input name="retailer" defaultValue={data.filters.retailer ?? ''} placeholder="Name or email" className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Tender reference
          <input name="tenderReference" defaultValue={data.filters.tenderReference ?? ''} placeholder="TND-..." className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Quote reference
          <input name="quoteReference" defaultValue={data.filters.quoteReference ?? ''} placeholder="...-Q01" className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          From
          <input type="date" name="from" defaultValue={formatDate(data.filters.from)} className="h-11 rounded-lg border border-slate-300 px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          To
          <input type="date" name="to" defaultValue={formatDate(data.filters.to)} className="h-11 rounded-lg border border-slate-300 px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Category
          <select name="category" defaultValue={data.filters.category ?? ''} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30">
            <option value="">All categories</option>
            {Object.keys(CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Region
          <input name="region" defaultValue={data.filters.region ?? ''} placeholder="e.g. Leeds" className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Status
          <select name="status" defaultValue={data.filters.status ?? ''} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30">
            <option value="">All statuses</option>
            <option value="DRAFT">Tender: Draft</option><option value="OPEN">Tender: Open</option><option value="CLOSED">Tender: Closed</option>
            <option value="SUBMITTED">Quote: Submitted</option><option value="ACCEPTED">Quote: Accepted</option><option value="REJECTED">Quote: Rejected</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Quoted value
          <select name="valueBand" defaultValue={data.filters.valueBand ?? ''} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30">
            <option value="">All values</option><option value="UNDER_1000">Under £1,000</option><option value="1000_TO_4999">£1,000 to £4,999</option><option value="5000_TO_9999">£5,000 to £9,999</option><option value="10000_PLUS">£10,000 and over</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Subscription plan
          <input name="subscriptionPlan" defaultValue={data.filters.subscriptionPlan ?? ''} placeholder="Plan or tier" className="h-11 rounded-lg border border-slate-300 px-3 font-normal placeholder:text-concrete-grey/70 focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-foundation-navy">
          Payment status
          <select name="paymentStatus" defaultValue={data.filters.paymentStatus ?? ''} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-normal focus:border-safety-amber focus:outline-none focus:ring-2 focus:ring-safety-amber/30">
            <option value="">All payment states</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option><option value="REVERSED">Reversed</option>
          </select>
        </label>
        <div className="flex items-end gap-3 sm:col-span-4">
          <button type="submit" className="min-h-11 rounded-lg bg-foundation-navy px-5 text-sm font-semibold text-white hover:bg-steel-blue">Apply filters</button>
          <a href="/super-user" className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-concrete-grey hover:bg-slate-100 hover:text-foundation-navy">Clear</a>
        </div>
      </form>

      <div className="mb-8 grid gap-5 sm:grid-cols-3 lg:grid-cols-7">
        <Metric label="New tenders" value={data.totals.newTenders} hint="Last 30 days" />
        <Metric label="Tender volume" value={data.totals.tenderVolume} hint="Filtered period" />
        <Metric label="Provider unlocks" value={data.totals.retailerUnlocks} hint={`${data.rates.matchRate}% of tenders`} />
        <Metric label="Quotes submitted" value={data.totals.quotesSubmitted} hint={`${data.rates.quoteRate}% after unlock`} />
        <Metric label="Accepted quotes" value={data.totals.acceptedQuotes} hint={`${data.rates.acceptanceRate}% acceptance`} />
        <Metric label="Fee revenue" value={`${money.format(data.totals.revenue)} excl. VAT`} hint="Confirmed fees" />
        <Metric label="VAT collected" value={money.format(data.financialQuarter.vatCollectedGbp)} hint={data.financialQuarter.label} />
      </div>

      <Card className="mb-8 border-l-4 border-l-safety-amber bg-amber-50/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-steel-blue">Decision insight</p>
            <h2 className="mt-2 font-heading text-lg font-bold text-foundation-navy">{insight}</h2>
            <p className="mt-2 text-sm text-concrete-grey">
              {bestConversionCategory ? `${bestConversionCategory.category} has the strongest acceptance rate at ${bestConversionCategory.acceptanceRate}%.` : 'Apply broader filters to surface a category insight.'}
              {strongestRegion ? ` ${strongestRegion.region} has the highest tender activity in this view.` : ''}
            </p>
          </div>
          <StatusBadge status={data.rates.acceptanceRate >= 25 ? 'approved' : 'pending'}>
            {data.rates.acceptanceRate >= 25 ? 'Healthy conversion' : 'Conversion to watch'}
          </StatusBadge>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Tender volume</h2>
              <p className="mt-1 text-sm text-concrete-grey">Demand trend for the selected period.</p>
            </div>
            <a href="/super-user/tenders" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">Drill down &rarr;</a>
          </div>
          <div className="h-64">
            {data.monthly.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthly}><CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip /><Line type="monotone" dataKey="tenders" stroke="#1D3D5C" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer> : <EmptyChart />}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-foundation-navy">Conversion rates</h2>
              <p className="mt-1 text-sm text-concrete-grey">Where demand progresses or falls away.</p>
            </div>
            <a href="/super-user/analytics" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">Drill down &rarr;</a>
          </div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Match', rate: data.rates.matchRate }, { name: 'Quote', rate: data.rates.quoteRate }, { name: 'Accept', rate: data.rates.acceptanceRate }]}><CartesianGrid stroke="#E2E8F0" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="rate" fill="#F5A524" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-bold text-foundation-navy">Regional activity</h2><p className="mt-1 text-sm text-concrete-grey">Locations generating the most demand.</p></div><a href="/super-user/tenders" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">View tenders &rarr;</a></div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.regions} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid stroke="#E2E8F0" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="region" width={80} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="tenders" name="Tenders" fill="#1D3D5C" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-bold text-foundation-navy">Category performance</h2><p className="mt-1 text-sm text-concrete-grey">Demand and quote acceptance by category.</p></div><a href="/super-user/categories" className="text-sm font-semibold text-steel-blue hover:text-foundation-navy">Manage categories &rarr;</a></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-concrete-grey"><tr><th className="pb-3">Category</th><th className="pb-3">Tenders</th><th className="pb-3">Quotes</th><th className="pb-3">Quoted value</th><th className="pb-3">Accept</th></tr></thead><tbody className="divide-y divide-slate-100">{data.categories.map((item) => <tr key={item.category}><td className="py-3 font-semibold text-foundation-navy">{item.category}</td><td className="py-3 text-concrete-grey">{item.tenders}</td><td className="py-3 text-concrete-grey">{item.quotes}</td><td className="py-3 text-concrete-grey">{money.format(item.value)}</td><td className="py-3"><StatusBadge status={item.acceptanceRate >= 25 ? 'approved' : 'pending'}>{`${item.acceptanceRate}%`}</StatusBadge></td></tr>)}</tbody></table></div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return <Card className="border-l-4 border-l-steel-blue p-5"><p className="font-heading text-2xl font-bold text-foundation-navy">{value}</p><p className="mt-2 text-xs font-semibold text-foundation-navy">{label}</p><p className="mt-1 text-xs text-concrete-grey">{hint}</p></Card>;
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-concrete-grey">No chart data for these filters.</div>;
}

function formatDate(value?: Date) {
  return value ? value.toISOString().slice(0, 10) : '';
}

function buildExportUrl(filters: AnalyticsData['filters']) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', formatDate(filters.from));
  if (filters.to) params.set('to', formatDate(filters.to));
  if (filters.client) params.set('client', filters.client);
  if (filters.retailer) params.set('retailer', filters.retailer);
  if (filters.tenderReference) params.set('tenderReference', filters.tenderReference);
  if (filters.quoteReference) params.set('quoteReference', filters.quoteReference);
  if (filters.category) params.set('category', filters.category);
  if (filters.region) params.set('region', filters.region);
  if (filters.status) params.set('status', filters.status);
  if (filters.valueBand) params.set('valueBand', filters.valueBand);
  if (filters.subscriptionPlan) params.set('subscriptionPlan', filters.subscriptionPlan);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
  const query = params.toString();
  return `/api/super-user/analytics/export${query ? `?${query}` : ''}`;
}
