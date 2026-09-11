import { prisma } from '@/server/data/prisma';

export type TenderEstimateInput = {
  category?: string | null;
  items?: Array<{
    category?: string | null;
    item?: string | null;
    description?: string | null;
    quantity?: string | null;
  }>;
};

export type QuoteEstimateBaseline = {
  category: string;
  baselineGbp: number;
  sampleSize: number;
  reviewedAt: Date;
};

export const DEFAULT_QUOTE_ESTIMATE_BASELINES: Record<string, number> = {
  General: 650,
  Groundworks: 1200,
  Electrical: 950,
  Plumbing: 1050,
  Roofing: 1400,
  Joinery: 1100,
  Landscaping: 800,
  Flooring: 900,
  Painting: 700,
  Masonry: 1250,
  'Mechanical & Electrical': 1600,
};

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseEstimateQuantity(quantity?: string | null): number {
  if (!quantity) return 1;
  const match = quantity.match(/\d+(?:\.\d+)?/);
  if (!match) return 1;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function selectBottomThirdPriceScale(pricesGbp: number[]): number | null {
  const prices = pricesGbp.filter((price) => Number.isFinite(price) && price > 0).sort((left, right) => left - right);
  if (prices.length === 0) return null;
  const bottomThird = prices.slice(0, Math.max(1, Math.ceil(prices.length / 3)));
  return roundCurrency(bottomThird[Math.floor((bottomThird.length - 1) / 2)]);
}

export function getUtcWeekStart(date = new Date()): Date {
  const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  return weekStart;
}

export function estimateTenderQuoteValue(
  input: TenderEstimateInput,
  baselines: Record<string, number> = DEFAULT_QUOTE_ESTIMATE_BASELINES,
): number {
  const categoryKey = (input.category ?? input.items?.[0]?.category ?? 'General').trim();
  const fallback = baselines[categoryKey]
    ?? Object.entries(baselines).find(([key]) => categoryKey.toLowerCase().includes(key.toLowerCase()))?.[1]
    ?? baselines.General;

  const items = input.items ?? [];
  if (items.length === 0) return roundCurrency(fallback);

  const itemEstimates = items.map((item) => {
    const itemCategory = (item.category ?? categoryKey).trim();
    const itemBaseline = baselines[itemCategory]
      ?? Object.entries(baselines).find(([key]) => itemCategory.toLowerCase().includes(key.toLowerCase()))?.[1]
      ?? fallback;

    const quantityFactor = parseEstimateQuantity(item.quantity);
    const descriptionText = `${item.item ?? ''} ${item.description ?? ''}`;
    const descriptorMultiplier = /concrete|brick|aggregate|stone|roof|tile|steel|pipe|cable|lighting|switch|pump|generator|hvac|insulation|timber|door|window/i.test(descriptionText)
      ? 1.28
      : 1.14;

    return itemBaseline * quantityFactor * descriptorMultiplier;
  });

  const conservativeScale = selectBottomThirdPriceScale(itemEstimates) ?? fallback;
  return roundCurrency(conservativeScale * 1.05);
}

export async function getReviewedQuoteEstimateBaselines(): Promise<Record<string, number>> {
  const rows = await prisma.quoteEstimateBaseline.findMany({ select: { category: true, baselineGbp: true } });
  return { ...DEFAULT_QUOTE_ESTIMATE_BASELINES, ...Object.fromEntries(rows.map((row) => [row.category, row.baselineGbp])) };
}

export async function refreshQuoteEstimateBaselines(reviewedAt = new Date()): Promise<QuoteEstimateBaseline[]> {
  const [quotes, quoteLines] = await Promise.all([
    prisma.quote.findMany({
      where: { priceGbp: { gt: 0 } },
      select: { priceGbp: true, tender: { select: { category: true } } },
    }),
    prisma.quoteLine.findMany({
      where: { priceGbp: { not: null } },
      select: { priceGbp: true, tenderItem: { select: { category: true } } },
    }),
  ]);
  const pricesByCategory = new Map<string, number[]>();
  const addObservation = (category: string | null | undefined, priceGbp: number | null | undefined) => {
    const key = category?.trim();
    if (!key || !priceGbp || priceGbp <= 0) return;
    pricesByCategory.set(key, [...(pricesByCategory.get(key) ?? []), priceGbp]);
  };

  quotes.forEach((quote) => addObservation(quote.tender.category, quote.priceGbp));
  quoteLines.forEach((line) => addObservation(line.tenderItem.category, line.priceGbp));

  const effectiveWeekStart = getUtcWeekStart(reviewedAt);
  const updates = [...pricesByCategory.entries()].flatMap(([category, prices]) => {
    const baselineGbp = selectBottomThirdPriceScale(prices);
    return baselineGbp === null ? [] : [{ category, baselineGbp, sampleSize: prices.length, reviewedAt, effectiveWeekStart }];
  });

  return Promise.all(updates.map((baseline) => prisma.quoteEstimateBaseline.upsert({
    where: { category: baseline.category },
    update: baseline,
    create: baseline,
  })));
}

export function applyEstimateOffset(estimateGbp: number, offsetPercent: number): number {
  const clamped = Number.isFinite(offsetPercent) ? offsetPercent : 0;
  return roundCurrency(estimateGbp * (1 + clamped / 100));
}

export function calculateEstimateVariancePercent(estimatedGbp: number, actualGbp: number): number {
  if (!actualGbp || !estimatedGbp) return 0;
  const variance = ((actualGbp - estimatedGbp) / estimatedGbp) * 100;
  return Number(variance.toFixed(2));
}