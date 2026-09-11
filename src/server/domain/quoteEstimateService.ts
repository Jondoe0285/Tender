import { prisma } from '@/server/data/prisma';
import { SERVICE_CATALOG } from '@/lib/categories';

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
  standardUnit: string;
  standardUnitSize: number;
  baselineGbp: number;
  observedUnitPriceGbp: number | null;
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

type PricingCatalogueRow = {
  key: string;
  service: string;
  category: string;
  item: string | null;
  standardUnit: string;
  standardUnitSize: number;
  estimatedUnitPriceGbp: number;
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

export function parseQuantityForUnit(quantity?: string | null): { value: number; unit: string } | null {
  if (!quantity) return null;
  const match = quantity.trim().match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unitText = quantity.toLowerCase().replace(match[1], '').trim();
  return { value, unit: normaliseUnit(unitText) };
}

export function normaliseUnit(unit: string): string {
  const value = unit.toLowerCase().trim();
  if (value.includes('tonne') || value === 't') return 'tonne';
  if (value.includes('m³') || value.includes('m3') || value.includes('cubic')) return 'm3';
  if (value.includes('pallet')) return 'pallet';
  if (value.includes('bag')) return 'bag';
  if (value.includes('skip')) return 'skip';
  if (value.includes('week')) return 'week';
  if (value.includes('month')) return 'month';
  if (value.includes('day')) return 'day';
  if (value.includes('hour')) return 'hour';
  return 'unit';
}

export function convertQuantityToStandardUnit(quantity: string | null | undefined, standardUnit: string, standardUnitSize: number): number | null {
  const parsed = parseQuantityForUnit(quantity);
  if (!parsed) return null;
  const target = normaliseUnit(standardUnit);
  const source = parsed.unit;
  let converted = parsed.value;
  if (source === 'day' && target === 'week') converted = parsed.value / 5;
  else if (source === 'week' && target === 'day') converted = parsed.value * 5;
  else if (source === 'month' && target === 'week') converted = parsed.value * 4.33;
  else if (source === 'week' && target === 'month') converted = parsed.value / 4.33;
  else if (source !== target && !(source === 'unit' && target === 'unit')) return null;
  const divisor = standardUnitSize > 0 ? standardUnitSize : 1;
  return converted / divisor;
}

export function unitPriceFromQuoteLine(priceGbp: number | null | undefined, quantity: string | null | undefined, standardUnit: string, standardUnitSize: number): number | null {
  if (!priceGbp || priceGbp <= 0) return null;
  const standardQuantity = convertQuantityToStandardUnit(quantity, standardUnit, standardUnitSize);
  if (!standardQuantity || standardQuantity <= 0) return null;
  return roundCurrency(priceGbp / standardQuantity);
}

export function standardUnitForPurchase(service: string, category: string, item: string | null): { standardUnit: string; standardUnitSize: number } {
  const text = `${service} ${category} ${item ?? ''}`.toLowerCase();
  if (text.includes('brick')) return { standardUnit: 'units', standardUnitSize: 1000 };
  if (text.includes('block')) return { standardUnit: 'units', standardUnitSize: 100 };
  if (text.includes('concrete') || text.includes('screed')) return { standardUnit: 'm3', standardUnitSize: 1 };
  if (text.includes('aggregate') || text.includes('sand') || text.includes('stone') || text.includes('spoil')) return { standardUnit: 'tonne', standardUnitSize: 1 };
  if (text.includes('timber') || text.includes('sheet') || text.includes('insulation') || text.includes('plasterboard')) return { standardUnit: 'units', standardUnitSize: 1 };
  if (service === 'Waste') return { standardUnit: 'skip', standardUnitSize: 1 };
  if (service === 'Plant Hire') return { standardUnit: 'week', standardUnitSize: 1 };
  if (service === 'Contractor Services' || service === 'Professional Services') return { standardUnit: 'week', standardUnitSize: 1 };
  return { standardUnit: 'unit', standardUnitSize: 1 };
}

export function estimatedUnitPriceForPurchase(service: string, category: string, item: string | null): number {
  const base = DEFAULT_QUOTE_ESTIMATE_BASELINES[service] ?? DEFAULT_QUOTE_ESTIMATE_BASELINES.General;
  const text = `${category} ${item ?? ''}`.toLowerCase();
  const multiplier = text.includes('brick') ? 0.85
    : text.includes('block') ? 0.55
      : text.includes('concrete') ? 0.16
        : text.includes('aggregate') || text.includes('sand') || text.includes('stone') ? 0.08
          : text.includes('crane') || text.includes('lifting') ? 1.6
            : text.includes('excavator') || text.includes('dumper') || text.includes('telehandler') ? 0.7
              : 1;
  return roundCurrency(Math.max(25, base * multiplier));
}

export function buildPricingCatalogue(): PricingCatalogueRow[] {
  return Object.entries(SERVICE_CATALOG).flatMap(([service, categories]) => Object.entries(categories).flatMap(([category, items]) => {
    const itemRows = (items as readonly string[]).map((item) => {
      const unit = standardUnitForPurchase(service, category, item);
      return { key: buildEstimateBaselineKey(service, category, item), service, category, item, ...unit, estimatedUnitPriceGbp: estimatedUnitPriceForPurchase(service, category, item) };
    });
    const unit = standardUnitForPurchase(service, category, null);
    return [{ key: buildEstimateBaselineKey(service, category), service, category, item: null, ...unit, estimatedUnitPriceGbp: estimatedUnitPriceForPurchase(service, category, null) }, ...itemRows];
  }));
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
  const persisted = new Map(rows.map((row) => [row.key, row]));
  const merged = buildPricingCatalogue().map((catalogueRow) => persisted.get(catalogueRow.key) ?? {
    id: catalogueRow.key,
    key: catalogueRow.key,
    service: catalogueRow.service,
    category: catalogueRow.category,
    item: catalogueRow.item,
    standardUnit: catalogueRow.standardUnit,
    standardUnitSize: catalogueRow.standardUnitSize,
    baselineGbp: catalogueRow.estimatedUnitPriceGbp,
    observedUnitPriceGbp: null,
    automaticOffsetPercent: 0,
    manualOffsetPercent: null,
    offsetMode: 'AUTOMATIC',
    sampleSize: 0,
    reviewedAt: new Date(0),
    effectiveWeekStart: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
  return merged.map((row) => {
    const offsetPercent = effectiveBaselineOffsetPercent(row);
    const adjustedEstimateGbp = adjustedBaselineGbp(row.baselineGbp, offsetPercent);
    const observedUnitPriceGbp = row.observedUnitPriceGbp ?? null;
    return {
      id: row.id,
      key: row.key,
      service: row.service,
      category: row.category,
      item: row.item,
      standardUnit: row.standardUnit,
      standardUnitSize: row.standardUnitSize,
      baselineGbp: row.baselineGbp,
      observedUnitPriceGbp,
      adjustedEstimateGbp,
      actualBaselineGbp: observedUnitPriceGbp,
      automaticOffsetPercent: row.automaticOffsetPercent,
      manualOffsetPercent: row.manualOffsetPercent,
      effectiveOffsetPercent: offsetPercent,
      offsetMode: row.offsetMode,
      sampleSize: row.sampleSize,
      reviewedAt: row.reviewedAt,
      variancePercent: observedUnitPriceGbp ? calculateEstimateVariancePercent(row.baselineGbp, observedUnitPriceGbp) : 0,
    };
  });
}

export async function setPricingIntelligenceManualOffset(id: string, offsetPercent: number | null) {
  const data = offsetPercent === null
    ? { offsetMode: 'AUTOMATIC', manualOffsetPercent: null }
    : { offsetMode: 'MANUAL', manualOffsetPercent: offsetPercent };
  const existing = await prisma.quoteEstimateBaseline.findFirst({ where: { OR: [{ id }, { key: id }] } });
  if (existing) return prisma.quoteEstimateBaseline.update({ where: { id: existing.id }, data });

  const catalogueRow = buildPricingCatalogue().find((row) => row.key === id);
  if (!catalogueRow) throw new Error('Pricing catalogue row not found');
  return prisma.quoteEstimateBaseline.create({
    data: {
      key: catalogueRow.key,
      service: catalogueRow.service,
      category: catalogueRow.category,
      item: catalogueRow.item,
      standardUnit: catalogueRow.standardUnit,
      standardUnitSize: catalogueRow.standardUnitSize,
      baselineGbp: catalogueRow.estimatedUnitPriceGbp,
      sampleSize: 0,
      reviewedAt: new Date(),
      effectiveWeekStart: getUtcWeekStart(),
      ...data,
    },
  });
}

export async function refreshQuoteEstimateBaselines(reviewedAt = new Date()): Promise<QuoteEstimateBaseline[]> {
  const [quoteLines] = await Promise.all([
    prisma.quoteLine.findMany({
      where: { priceGbp: { not: null } },
      select: { priceGbp: true, tenderItem: { select: { category: true, subcategory: true, item: true, quantity: true } } },
    }),
  ]);
  const catalogue = buildPricingCatalogue();
  const catalogueByKey = new Map(catalogue.map((row) => [row.key, row]));
  const pricesByKey = new Map<string, number[]>();
  quoteLines.forEach((line) => {
    const key = buildEstimateBaselineKey(line.tenderItem.category, line.tenderItem.subcategory, line.tenderItem.item);
    const catalogueRow = catalogueByKey.get(key) ?? catalogueByKey.get(buildEstimateBaselineKey(line.tenderItem.category, line.tenderItem.subcategory));
    if (!catalogueRow) return;
    const unitPrice = unitPriceFromQuoteLine(line.priceGbp, line.tenderItem.quantity, catalogueRow.standardUnit, catalogueRow.standardUnitSize);
    if (!unitPrice) return;
    pricesByKey.set(catalogueRow.key, [...(pricesByKey.get(catalogueRow.key) ?? []), unitPrice]);
  });

  const effectiveWeekStart = getUtcWeekStart(reviewedAt);
  const existingRows = await prisma.quoteEstimateBaseline.findMany({ select: { key: true, baselineGbp: true, offsetMode: true } });
  const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
  const updates = catalogue.map((catalogueRow) => {
    const prices = pricesByKey.get(catalogueRow.key) ?? [];
    const observedUnitPriceGbp = selectBottomThirdPriceScale(prices);
    return {
      key: catalogueRow.key,
      service: catalogueRow.service,
      category: catalogueRow.category,
      item: catalogueRow.item,
      standardUnit: catalogueRow.standardUnit,
      standardUnitSize: catalogueRow.standardUnitSize,
      baselineGbp: existingByKey.get(catalogueRow.key)?.baselineGbp ?? catalogueRow.estimatedUnitPriceGbp,
      observedUnitPriceGbp,
      automaticOffsetPercent: observedUnitPriceGbp === null ? 0 : calculateAutomaticOffsetPercent(catalogueRow.estimatedUnitPriceGbp, observedUnitPriceGbp),
      sampleSize: prices.length,
      reviewedAt,
      effectiveWeekStart,
    };
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