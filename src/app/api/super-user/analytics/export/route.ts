import { NextResponse } from 'next/server';
import { getAnalytics, parseAnalyticsFilters } from '@/server/domain/analyticsService';
import { requireFullSuperUser } from '@/server/auth/session';

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await requireFullSuperUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Super User access required' }, { status: 403 });

  const url = new URL(request.url);
  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });
  const filters = parseAnalyticsFilters(searchParams);
  const data = await getAnalytics(filters);
  const rows = [
    ['Metric', 'Value'],
    ...Object.entries(filters).map(([key, value]) => [key, value instanceof Date ? value.toISOString().slice(0, 10) : value]),
    [],
    ['New tenders', data.totals.newTenders],
    ['Tender volume', data.totals.tenderVolume],
    ['Retailer unlocks', data.totals.retailerUnlocks],
    ['Quotes submitted', data.totals.quotesSubmitted],
    ['Accepted quotes', data.totals.acceptedQuotes],
    ['Revenue GBP', data.totals.revenue],
    ['Match rate', `${data.rates.matchRate}%`],
    ['Quote rate', `${data.rates.quoteRate}%`],
    ['Acceptance rate', `${data.rates.acceptanceRate}%`],
    [],
    ['Category', 'Tenders', 'Unlocks', 'Quotes', 'Accepted', 'Acceptance rate', 'Quoted value GBP'],
    ...data.categories.map((item) => [item.category, item.tenders, item.unlocks, item.quotes, item.accepted, `${item.acceptanceRate}%`, item.value]),
    [],
    ['Region', 'Tenders', 'Quotes', 'Accepted'],
    ...data.regions.map((item) => [item.region, item.tenders, item.quotes, item.accepted]),
  ];
  const csv = rows.map((row) => row.map((cell) => csvCell(cell ?? '')).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trade-tender-analytics.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
