import { prisma } from '@/server/data/prisma';

function monthKey(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export async function getRetailerAnalytics(retailerId: string) {
  const [matches, unlocks, quotes, platformMatchCount, platformUnlockCount, platformQuoteCount, platformAcceptedCount] = await Promise.all([
    prisma.tenderMatch.findMany({
      where: { retailerId },
      select: { tenderId: true, notifiedAt: true, tender: { select: { category: true, location: true, createdAt: true } } },
    }),
    prisma.unlock.count({ where: { retailerId } }),
    prisma.quote.findMany({
      where: { retailerId },
      select: { tenderId: true, priceGbp: true, status: true, submittedAt: true, tender: { select: { category: true, location: true } } },
    }),
    prisma.tenderMatch.count(),
    prisma.unlock.count(),
    prisma.quote.count(),
    prisma.quote.count({ where: { status: 'ACCEPTED' } }),
  ]);

  const notifiedAtByTender = new Map(matches.map((match) => [match.tenderId, match.notifiedAt]));

  const monthMap = new Map<string, { matched: number; quotes: number }>();
  const categoryMap = new Map<string, { matched: number; quotes: number; accepted: number; value: number }>();
  const regionMap = new Map<string, { matched: number; quotes: number; accepted: number }>();

  for (const match of matches) {
    const month = monthKey(match.tender.createdAt);
    const monthEntry = monthMap.get(month) ?? { matched: 0, quotes: 0 };
    monthEntry.matched += 1;
    monthMap.set(month, monthEntry);

    const category = categoryMap.get(match.tender.category) ?? { matched: 0, quotes: 0, accepted: 0, value: 0 };
    category.matched += 1;
    categoryMap.set(match.tender.category, category);

    const region = regionMap.get(match.tender.location) ?? { matched: 0, quotes: 0, accepted: 0 };
    region.matched += 1;
    regionMap.set(match.tender.location, region);
  }

  let totalQuotedGbp = 0;
  let totalAcceptedGbp = 0;
  let acceptedQuoteCount = 0;
  let responseHoursSum = 0;
  let responseCount = 0;

  for (const quote of quotes) {
    const month = monthKey(quote.submittedAt);
    const monthEntry = monthMap.get(month) ?? { matched: 0, quotes: 0 };
    monthEntry.quotes += 1;
    monthMap.set(month, monthEntry);

    const category = categoryMap.get(quote.tender.category) ?? { matched: 0, quotes: 0, accepted: 0, value: 0 };
    category.quotes += 1;
    category.value += quote.priceGbp;
    if (quote.status === 'ACCEPTED') category.accepted += 1;
    categoryMap.set(quote.tender.category, category);

    const region = regionMap.get(quote.tender.location) ?? { matched: 0, quotes: 0, accepted: 0 };
    region.quotes += 1;
    if (quote.status === 'ACCEPTED') region.accepted += 1;
    regionMap.set(quote.tender.location, region);

    totalQuotedGbp += quote.priceGbp;
    if (quote.status === 'ACCEPTED') {
      totalAcceptedGbp += quote.priceGbp;
      acceptedQuoteCount += 1;
    }

    const notifiedAt = notifiedAtByTender.get(quote.tenderId);
    if (notifiedAt) {
      const hours = (quote.submittedAt.getTime() - notifiedAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0) {
        responseHoursSum += hours;
        responseCount += 1;
      }
    }
  }

  const matchedCount = matches.length;
  const quoteCount = quotes.length;
  const unlockRate = matchedCount ? Math.round((unlocks / matchedCount) * 100) : 0;
  const winRate = quoteCount ? Math.round((acceptedQuoteCount / quoteCount) * 100) : 0;

  return {
    totals: { matched: matchedCount, unlocked: unlocks, quotesSubmitted: quoteCount, accepted: acceptedQuoteCount },
    rates: { unlockRate, winRate },
    monthly: Array.from(monthMap, ([month, values]) => ({ month, ...values })),
    categories: Array.from(categoryMap, ([category, values]) => ({
      category,
      ...values,
      winRate: values.quotes ? Math.round((values.accepted / values.quotes) * 100) : 0,
    })).sort((a, b) => b.matched - a.matched),
    regions: Array.from(regionMap, ([region, values]) => ({ region, ...values })).sort((a, b) => b.matched - a.matched).slice(0, 8),
    quoteValue: {
      totalQuotedGbp,
      averageQuotedGbp: quoteCount ? Math.round(totalQuotedGbp / quoteCount) : 0,
      totalAcceptedGbp,
      averageAcceptedGbp: acceptedQuoteCount ? Math.round(totalAcceptedGbp / acceptedQuoteCount) : 0,
    },
    responseTime: {
      averageHours: responseCount ? Math.round((responseHoursSum / responseCount) * 10) / 10 : null,
    },
    benchmark: {
      platformUnlockRate: platformMatchCount ? Math.round((platformUnlockCount / platformMatchCount) * 100) : 0,
      platformWinRate: platformQuoteCount ? Math.round((platformAcceptedCount / platformQuoteCount) * 100) : 0,
    },
  };
}

export type RetailerAnalytics = Awaited<ReturnType<typeof getRetailerAnalytics>>;
