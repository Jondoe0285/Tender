import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { analyticsFilterSchema } from '@/lib/schemas/analytics';
import { estimateTenderQuoteValue, getPricingIntelligenceByCategory, getReviewedQuoteEstimateBaselines } from '@/server/domain/quoteEstimateService';
import { getQuoteEstimateMasterReductionPercentage } from '@/server/domain/platformSettings';

export type AnalyticsFilters = {
  from?: Date;
  to?: Date;
  client?: string;
  retailer?: string;
  tenderReference?: string;
  quoteReference?: string;
  category?: string;
  region?: string;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  valueBand?: 'UNDER_1000' | '1000_TO_4999' | '5000_TO_9999' | '10000_PLUS';
  subscriptionPlan?: string;
  paymentStatus?: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED' | 'REVERSED';
};

type AnalyticsTender = {
  id: string;
  reference: string;
  category: string;
  location: string;
  createdAt: Date;
  client: { id: string; contactName: string; email: string };
  items: { category: string | null; subcategory: string | null; item: string | null; description: string | null; quantity: string | null }[];
  _count: { matches: number; unlocks: number; quotes: number };
  quotes: { status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'; priceGbp: number }[];
};

export function buildAnalyticsTenderWhere(filters: AnalyticsFilters): Prisma.TenderWhereInput {
  const conditions: Prisma.TenderWhereInput[] = [
    {
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
    ...(filters.client
      ? { client: { OR: [{ contactName: { contains: filters.client, mode: 'insensitive' } }, { email: { contains: filters.client, mode: 'insensitive' } }] } }
      : {}),
    ...(filters.tenderReference ? { reference: { contains: filters.tenderReference, mode: 'insensitive' } } : {}),
  },
  ];

  if (filters.retailer) {
    conditions.push({
      OR: [
        { unlocks: { some: { retailer: { OR: [{ contactName: { contains: filters.retailer, mode: 'insensitive' } }, { email: { contains: filters.retailer, mode: 'insensitive' } }] } } } },
        { quotes: { some: { retailer: { OR: [{ contactName: { contains: filters.retailer, mode: 'insensitive' } }, { email: { contains: filters.retailer, mode: 'insensitive' } }] } } } },
      ],
    });
  }
  if (filters.quoteReference) conditions.push({ quotes: { some: { reference: { contains: filters.quoteReference, mode: 'insensitive' } } } });
  if (filters.status) {
    if (['DRAFT', 'OPEN', 'CLOSED'].includes(filters.status)) conditions.push({ status: filters.status as 'DRAFT' | 'OPEN' | 'CLOSED' });
    else conditions.push({ quotes: { some: { status: filters.status as 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' } } });
  }
  if (filters.valueBand) {
    const priceGbp = filters.valueBand === 'UNDER_1000' ? { lt: 1000 }
      : filters.valueBand === '1000_TO_4999' ? { gte: 1000, lte: 4999 }
        : filters.valueBand === '5000_TO_9999' ? { gte: 5000, lte: 9999 }
          : { gte: 10000 };
    conditions.push({ quotes: { some: { priceGbp } } });
  }
  if (filters.subscriptionPlan) {
    const planSearch = { contains: filters.subscriptionPlan, mode: 'insensitive' as const };
    conditions.push({
      OR: [
        { unlocks: { some: { retailer: { memberships: { some: { tier: { name: planSearch } } } } } } },
        { quotes: { some: { retailer: { memberships: { some: { tier: { name: planSearch } } } } } } },
        { unlocks: { some: { retailer: { subscriptions: { some: { plan: { name: planSearch } } } } } } },
        { quotes: { some: { retailer: { subscriptions: { some: { plan: { name: planSearch } } } } } } },
      ],
    });
  }
  if (filters.paymentStatus) {
    conditions.push({
      OR: [
        { unlockPayments: { some: { status: filters.paymentStatus } } },
        { quotes: { some: { releasePayment: { is: { status: filters.paymentStatus } } } } },
      ],
    });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
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

export type VerificationTierKey = 'INDEPENDENTLY_VERIFIED' | 'VERIFIED_BY_AI' | 'UNVERIFIED';

const VERIFICATION_TIER_LABELS: Record<VerificationTierKey, string> = {
  INDEPENDENTLY_VERIFIED: 'Enhanced Verified',
  VERIFIED_BY_AI: 'Verified by Ai',
  UNVERIFIED: 'Unverified',
};

/** Groups quotes by the submitting Provider's *current* verification status — a read-time snapshot, not the status at submission. */
async function getVerificationBreakdown(quotes: { status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'; retailerId: string }[]) {
  const retailerIds = [...new Set(quotes.map((quote) => quote.retailerId))];
  const profiles = retailerIds.length
    ? await prisma.retailerProfile.findMany({ where: { userId: { in: retailerIds } }, select: { userId: true, verificationStatus: true, independentReviewStatus: true } })
    : [];
  const profileByRetailerId = new Map(profiles.map((profile) => [profile.userId, profile] as const));

  const buckets: Record<VerificationTierKey, { submitted: number; accepted: number }> = {
    INDEPENDENTLY_VERIFIED: { submitted: 0, accepted: 0 },
    VERIFIED_BY_AI: { submitted: 0, accepted: 0 },
    UNVERIFIED: { submitted: 0, accepted: 0 },
  };

  for (const quote of quotes) {
    const profile = profileByRetailerId.get(quote.retailerId);
    const tier: VerificationTierKey = profile?.independentReviewStatus === 'APPROVED'
      ? 'INDEPENDENTLY_VERIFIED'
      : profile?.verificationStatus === 'VERIFIED'
        ? 'VERIFIED_BY_AI'
        : 'UNVERIFIED';
    buckets[tier].submitted += 1;
    if (quote.status === 'ACCEPTED') buckets[tier].accepted += 1;
  }

  return (Object.keys(buckets) as VerificationTierKey[]).map((tier) => ({
    tier,
    label: VERIFICATION_TIER_LABELS[tier],
    submitted: buckets[tier].submitted,
    accepted: buckets[tier].accepted,
    acceptanceRate: buckets[tier].submitted ? Math.round((buckets[tier].accepted / buckets[tier].submitted) * 100) : 0,
  }));
}

export async function getAnalytics(filters: AnalyticsFilters = {}) {
  const tenderWhere = buildAnalyticsTenderWhere(filters);
  const [masterReductionPercent, estimateBaselines, pricingRows] = await Promise.all([
    getQuoteEstimateMasterReductionPercentage(),
    getReviewedQuoteEstimateBaselines(),
    getPricingIntelligenceByCategory(),
  ]);
  const tenders = (await prisma.tender.findMany({
    where: tenderWhere,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { matches: true, unlocks: true, quotes: true } },
      client: { select: { id: true, contactName: true, email: true } },
      items: { select: { category: true, subcategory: true, item: true, description: true, quantity: true } },
      quotes: { select: { status: true, priceGbp: true } },
    },
  })) as AnalyticsTender[];

  const tenderIds = tenders.map((tender) => tender.id);
  const financialQuarter = getFinancialQuarter();
  const [unlocks, quotes, payments, vatPayments] = await Promise.all([
    prisma.unlock.findMany({ where: { tenderId: { in: tenderIds } }, select: { tenderId: true } }),
    prisma.quote.findMany({ where: { tenderId: { in: tenderIds } }, select: { tenderId: true, status: true, retailerId: true } }),
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
  const verificationBreakdown = await getVerificationBreakdown(quotes);
  const averageVariancePercent = pricingRows.length
    ? pricingRows.reduce((sum, item) => sum + item.variancePercent, 0) / pricingRows.length
    : 0;
  const accuracyBands = [
    { label: 'Within 5%', count: pricingRows.filter((item) => Math.abs(item.variancePercent) <= 5).length },
    { label: 'Within 10%', count: pricingRows.filter((item) => Math.abs(item.variancePercent) > 5 && Math.abs(item.variancePercent) <= 10).length },
    { label: 'Within 20%', count: pricingRows.filter((item) => Math.abs(item.variancePercent) > 10 && Math.abs(item.variancePercent) <= 20).length },
    { label: 'Over 20%', count: pricingRows.filter((item) => Math.abs(item.variancePercent) > 20).length },
  ];

  const tenderDetails = tenders.map((tender) => ({
    id: tender.id,
    reference: tender.reference,
    client: tender.client,
    category: tender.category,
    location: tender.location,
    createdAt: tender.createdAt,
    quotes: tender._count.quotes,
    acceptedQuotes: tender.quotes.filter((quote) => quote.status === 'ACCEPTED').length,
    quotedValue: tender.quotes.reduce((sum, quote) => sum + quote.priceGbp, 0),
    estimatedValueGbp: estimateTenderQuoteValue({ category: tender.category, items: tender.items }, estimateBaselines),
  }));

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
    verificationBreakdown,
    tenderDetails,
    pricingIntelligence: {
      masterReductionPercent,
      averageVariancePercent: Number(averageVariancePercent.toFixed(2)),
      itemCount: pricingRows.length,
      sampleSize: pricingRows.reduce((sum, item) => sum + item.sampleSize, 0),
      accuracyBands,
    },
  };
}

export function parseAnalyticsFilters(searchParams: Record<string, string | string[] | undefined>): AnalyticsFilters {
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const parsed = analyticsFilterSchema.safeParse({
    client: value('client'),
    retailer: value('retailer'),
    tenderReference: value('tenderReference'),
    quoteReference: value('quoteReference'),
    category: value('category'),
    region: value('region'),
    status: value('status'),
    from: value('from'),
    to: value('to'),
    valueBand: value('valueBand'),
    subscriptionPlan: value('subscriptionPlan'),
    paymentStatus: value('paymentStatus'),
  });
  if (!parsed.success) return {};
  const { from: fromValue, to: toValue, ...filters } = parsed.data;
  return {
    ...filters,
    from: fromValue ? new Date(`${fromValue}T00:00:00.000Z`) : undefined,
    to: toValue ? new Date(`${toValue}T23:59:59.999Z`) : undefined,
  };
}
