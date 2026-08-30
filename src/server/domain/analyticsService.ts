import { prisma } from '@/server/data/prisma';

export type AnalyticsFilters = {
  from?: Date;
  to?: Date;
  category?: string;
  region?: string;
};

type AnalyticsTender = {
  id: string;
  reference: string;
  category: string;
  location: string;
  createdAt: Date;
  _count: { matches: number; unlocks: number; quotes: number };
  quotes: { status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'; priceGbp: number }[];
};

function dateWhere(filters: AnalyticsFilters) {
  return {
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.region ? { location: filters.region } : {}),
  };
}

function monthKey(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export function getFinancialQuarter(date = new Date()) {
  const year = date.getUTCFullYear();
  const quarterIndex = Math.floor(((date.getUTCMonth() + 9) % 12) / 3);
  const financialYearStart = date.getUTCMonth() < 3 ? year - 1 : year;
  const start = new Date(Date.UTC(financialYearStart, 3 + quarterIndex * 3, 1));
  const end = new Date(Date.UTC(financialYearStart, 3 + (quarterIndex + 1) * 3, 1));
  return { start, end, label: `Q${quarterIndex + 1} ${financialYearStart}/${String(financialYearStart + 1).slice(-2)}` };
}

export async function getAnalytics(filters: AnalyticsFilters = {}) {
  const tenderWhere = dateWhere(filters);
  const tenders = (await prisma.tender.findMany({
    where: tenderWhere,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { matches: true, unlocks: true, quotes: true } },
      quotes: { select: { status: true, priceGbp: true } },
    },
  })) as AnalyticsTender[];

  const tenderIds = tenders.map((tender) => tender.id);
  const financialQuarter = getFinancialQuarter();
  const [unlocks, quotes, payments, vatPayments] = await Promise.all([
    prisma.unlock.findMany({ where: { tenderId: { in: tenderIds } }, select: { tenderId: true } }),
    prisma.quote.findMany({ where: { tenderId: { in: tenderIds } }, select: { tenderId: true, status: true } }),
    prisma.payment.findMany({
      where: {
        status: 'CONFIRMED',
        OR: [
          { type: 'RETAILER_UNLOCK', unlock: { tenderId: { in: tenderIds } } },
          { type: 'CLIENT_RELEASE', releases: { some: { tenderId: { in: tenderIds } } } },
        ],
      },
      select: { amountGbp: true, type: true },
    }),
    prisma.payment.findMany({
      where: { status: 'CONFIRMED', confirmedAt: { gte: financialQuarter.start, lt: financialQuarter.end } },
      select: { vatGbp: true },
    }),
  ]);

  const monthMap = new Map<string, number>();
  const categoryMap = new Map<string, { tenders: number; unlocks: number; quotes: number; accepted: number; value: number }>();
  const regionMap = new Map<string, { tenders: number; quotes: number; accepted: number }>();

  for (const tender of tenders) {
    const month = monthKey(tender.createdAt);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);

    const category = categoryMap.get(tender.category) ?? { tenders: 0, unlocks: 0, quotes: 0, accepted: 0, value: 0 };
    category.tenders += 1;
    category.unlocks += tender._count.unlocks;
    category.quotes += tender._count.quotes;
    category.accepted += tender.quotes.filter((quote) => quote.status === 'ACCEPTED').length;
    category.value += tender.quotes.reduce((sum, quote) => sum + quote.priceGbp, 0);
    categoryMap.set(tender.category, category);

    const region = regionMap.get(tender.location) ?? { tenders: 0, quotes: 0, accepted: 0 };
    region.tenders += 1;
    region.quotes += tender._count.quotes;
    region.accepted += tender.quotes.filter((quote) => quote.status === 'ACCEPTED').length;
    regionMap.set(tender.location, region);
  }

  const tenderCount = tenders.length;
  const unlockCount = unlocks.length;
  const quoteCount = quotes.length;
  const acceptedCount = quotes.filter((quote) => quote.status === 'ACCEPTED').length;
  const revenue = payments.reduce((sum, payment) => sum + payment.amountGbp, 0);
  const vatCollectedGbp = vatPayments.reduce((sum, payment) => sum + payment.vatGbp, 0);

  return {
    filters,
    totals: {
      newTenders: tenders.filter((tender) => tender.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
      tenderVolume: tenderCount,
      retailerUnlocks: unlockCount,
      quotesSubmitted: quoteCount,
      acceptedQuotes: acceptedCount,
      revenue,
      vatCollectedGbp,
    },
    rates: {
      matchRate: tenderCount ? Math.round((unlockCount / tenderCount) * 100) : 0,
      quoteRate: unlockCount ? Math.round((quoteCount / unlockCount) * 100) : 0,
      acceptanceRate: quoteCount ? Math.round((acceptedCount / quoteCount) * 100) : 0,
    },
    financialQuarter: { label: financialQuarter.label, vatCollectedGbp },
    monthly: Array.from(monthMap, ([month, tenders]) => ({ month, tenders })),
    categories: Array.from(categoryMap, ([category, values]) => ({ category, ...values, acceptanceRate: values.quotes ? Math.round((values.accepted / values.quotes) * 100) : 0 })).sort((a, b) => b.tenders - a.tenders),
    regions: Array.from(regionMap, ([region, values]) => ({ region, ...values })).sort((a, b) => b.tenders - a.tenders).slice(0, 8),
  };
}

export function parseAnalyticsFilters(searchParams: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const fromValue = value('from');
  const toValue = value('to');
  return {
    from: fromValue ? new Date(`${fromValue}T00:00:00.000Z`) : undefined,
    to: toValue ? new Date(`${toValue}T23:59:59.999Z`) : undefined,
    category: value('category') || undefined,
    region: value('region') || undefined,
  };
}
