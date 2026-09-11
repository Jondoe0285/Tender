import { prisma } from '@/server/data/prisma';

export type TenderEstimateInput = {
  category?: string | null;
  items?: Array<{
    category?: string | null;
    subcategory?: string | null;
    item?: string | null;
    description?: string | null;
    quantity?: string | null;
  }>;
};

export type QuoteEstimateBaseline = {
  key: string;
  service: string;
  category: string;
  item: string | null;
  baselineGbp: number;
  automaticOffsetPercent: number;
  manualOffsetPercent: number | null;
  offsetMode: string;
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

export function buildEstimateBaselineKey(service?: string | null, category?: string | null, item?: string | null): string {
  return [service, category, item].map((value) => value?.trim()).filter(Boolean).join(' > ');
}

export function effectiveBaselineOffsetPercent(baseline: Pick<QuoteEstimateBaseline, 'automaticOffsetPercent' | 'manualOffsetPercent' | 'offsetMode'>): number {
  return baseline.offsetMode === 'MANUAL' && baseline.manualOffsetPercent !== null ? baseline.manualOffsetPercent : baseline.automaticOffsetPercent;
}

export function adjustedBaselineGbp(baselineGbp: number, offsetPercent: number): number {
  return roundCurrency(baselineGbp * (1 + offsetPercent / 100));
}

export function calculateAutomaticOffsetPercent(previousBaselineGbp: number, observedBaselineGbp: number): number {
  if (!previousBaselineGbp || previousBaselineGbp <= 0) return 0;
  return Number((((observedBaselineGbp - previousBaselineGbp) / previousBaselineGbp) * 100).toFixed(2));
}

export function applyMasterEstimateReduction(estimateGbp: number, reductionPercent: number): number {
  const reduction = Math.min(Math.max(Number.isFinite(reductionPercent) ? reductionPercent : 0, 0), 100);
  return roundCurrency(estimateGbp * (1 - reduction / 100));
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
    const itemKey = buildEstimateBaselineKey(itemCategory, item.subcategory, item.item);
    const itemCategoryKey = buildEstimateBaselineKey(itemCategory, item.subcategory);
    const itemBaseline = baselines[itemKey]
      ?? baselines[itemCategoryKey]
      ?? baselines[itemCategory]
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
  const rows = await prisma.quoteEstimateBaseline.findMany({ select: { key: true, service: true, category: true, baselineGbp: true, automaticOffsetPercent: true, manualOffsetPercent: true, offsetMode: true } });
  const reviewed = Object.fromEntries(rows.flatMap((row) => {
    const offsetPercent = effectiveBaselineOffsetPercent(row);
    const value = adjustedBaselineGbp(row.baselineGbp, offsetPercent);
    return [[row.key, value], [buildEstimateBaselineKey(row.service, row.category), value], [row.service, value]];
  }));
  return { ...DEFAULT_QUOTE_ESTIMATE_BASELINES, ...reviewed };
}

export async function getPricingIntelligenceByCategory() {
  const rows = await prisma.quoteEstimateBaseline.findMany({ orderBy: [{ service: 'asc' }, { category: 'asc' }, { item: 'asc' }] });
  return rows.map((row) => {
    const offsetPercent = effectiveBaselineOffsetPercent(row);
    const adjustedEstimateGbp = adjustedBaselineGbp(row.baselineGbp, offsetPercent);
    const actualBaselineGbp = adjustedBaselineGbp(row.baselineGbp, row.automaticOffsetPercent);
    return {
      id: row.id,
      key: row.key,
      service: row.service,
      category: row.category,
      item: row.item,
      baselineGbp: row.baselineGbp,
      adjustedEstimateGbp,
      actualBaselineGbp,
      automaticOffsetPercent: row.automaticOffsetPercent,
      manualOffsetPercent: row.manualOffsetPercent,
      effectiveOffsetPercent: offsetPercent,
      offsetMode: row.offsetMode,
      sampleSize: row.sampleSize,
      reviewedAt: row.reviewedAt,
      variancePercent: calculateEstimateVariancePercent(adjustedEstimateGbp, actualBaselineGbp),
    };
  });
}

export async function setPricingIntelligenceManualOffset(id: string, offsetPercent: number | null) {
  return prisma.quoteEstimateBaseline.update({
    where: { id },
    data: offsetPercent === null
      ? { offsetMode: 'AUTOMATIC', manualOffsetPercent: null }
      : { offsetMode: 'MANUAL', manualOffsetPercent: offsetPercent },
  });
}

export async function refreshQuoteEstimateBaselines(reviewedAt = new Date()): Promise<QuoteEstimateBaseline[]> {
  const [quotes, quoteLines] = await Promise.all([
    prisma.quote.findMany({
      where: { priceGbp: { gt: 0 } },
      select: { priceGbp: true, tender: { select: { category: true } } },
    }),
    prisma.quoteLine.findMany({
      where: { priceGbp: { not: null } },
      select: { priceGbp: true, tenderItem: { select: { category: true, subcategory: true, item: true } } },
    }),
  ]);
  const pricesByCategory = new Map<string, { service: string; category: string; item: string | null; prices: number[] }>();
  const addObservation = (service: string | null | undefined, category: string | null | undefined, item: string | null | undefined, priceGbp: number | null | undefined) => {
    const serviceKey = service?.trim();
    const categoryKey = category?.trim() || serviceKey;
    if (!serviceKey || !categoryKey || !priceGbp || priceGbp <= 0) return;
    const key = buildEstimateBaselineKey(serviceKey, categoryKey, item);
    const current = pricesByCategory.get(key) ?? { service: serviceKey, category: categoryKey, item: item?.trim() || null, prices: [] };
    pricesByCategory.set(key, { ...current, prices: [...current.prices, priceGbp] });
  };

  quotes.forEach((quote) => addObservation(quote.tender.category, quote.tender.category, null, quote.priceGbp));
  quoteLines.forEach((line) => addObservation(line.tenderItem.category, line.tenderItem.subcategory, line.tenderItem.item, line.priceGbp));

  const effectiveWeekStart = getUtcWeekStart(reviewedAt);
  const existingRows = await prisma.quoteEstimateBaseline.findMany({ select: { key: true, baselineGbp: true, offsetMode: true } });
  const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
  const updates = [...pricesByCategory.entries()].flatMap(([key, observation]) => {
    const observedBaselineGbp = selectBottomThirdPriceScale(observation.prices);
    if (observedBaselineGbp === null) return [];
    const previousBaselineGbp = existingByKey.get(key)?.baselineGbp ?? DEFAULT_QUOTE_ESTIMATE_BASELINES[observation.service] ?? observedBaselineGbp;
    return [{ key, service: observation.service, category: observation.category, item: observation.item, baselineGbp: observedBaselineGbp, automaticOffsetPercent: calculateAutomaticOffsetPercent(previousBaselineGbp, observedBaselineGbp), sampleSize: observation.prices.length, reviewedAt, effectiveWeekStart }];
  });

  return Promise.all(updates.map((baseline) => prisma.quoteEstimateBaseline.upsert({
    where: { key: baseline.key },
    update: { ...baseline, offsetMode: existingByKey.get(baseline.key)?.offsetMode === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC' },
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