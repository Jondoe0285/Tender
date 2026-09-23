import { isSpecifiedItemService } from '@/lib/categories';

function parseQuantity(quantity: string): { value: number; unit: string } | null {
  const match = quantity.trim().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, unit: match[2].trim() };
}

export const QUOTE_PRICING_KINDS = ['UNIT', 'LUMP', 'DAYWORKS'] as const;
export type QuotePricingKind = (typeof QUOTE_PRICING_KINDS)[number];

export type QuoteLinePriceInput = {
  available: boolean;
  unitRateGbp?: number;
  priceGbp?: number;
  pricingKind?: QuotePricingKind;
};

export type PricedQuoteLine = {
  available: boolean;
  priceGbp: number | null;
  unitRateGbp: number | null;
  quantityValue: number | null;
  unit: string | null;
  pricingKind: QuotePricingKind;
};

function roundWholePounds(value: number): number {
  return Math.max(1, Math.round(value));
}

export function pricedQuoteLine(
  item: { category: string; quantity: string },
  input: QuoteLinePriceInput,
): { line: PricedQuoteLine; error?: string } {
  if (!input.available) {
    return {
      line: {
        available: false,
        priceGbp: null,
        unitRateGbp: null,
        quantityValue: null,
        unit: null,
        pricingKind: 'LUMP',
      },
    };
  }

  const parsed = parseQuantity(item.quantity);
  const specified = isSpecifiedItemService(item.category);
  const kind: QuotePricingKind = input.pricingKind ?? (specified ? 'UNIT' : 'LUMP');

  if (kind === 'UNIT' || kind === 'DAYWORKS' || specified) {
    if (input.unitRateGbp == null || !(input.unitRateGbp > 0)) {
      return { line: emptyUnavailable(), error: 'Quote specified lines as a unit rate times quantity' };
    }
    if (!parsed) {
      return { line: emptyUnavailable(), error: 'Quote specified lines as a unit rate times quantity' };
    }
    return {
      line: {
        available: true,
        priceGbp: roundWholePounds(input.unitRateGbp * parsed.value),
        unitRateGbp: input.unitRateGbp,
        quantityValue: parsed.value,
        unit: parsed.unit,
        pricingKind: specified ? 'UNIT' : kind,
      },
    };
  }

  if (input.priceGbp == null || !Number.isInteger(input.priceGbp) || input.priceGbp < 1) {
    return { line: emptyUnavailable(), error: 'Enter a lump price for this line' };
  }

  return {
    line: {
      available: true,
      priceGbp: input.priceGbp,
      unitRateGbp: null,
      quantityValue: parsed?.value ?? null,
      unit: parsed?.unit ?? null,
      pricingKind: 'LUMP',
    },
  };
}

function emptyUnavailable(): PricedQuoteLine {
  return {
    available: true,
    priceGbp: null,
    unitRateGbp: null,
    quantityValue: null,
    unit: null,
    pricingKind: 'LUMP',
  };
}
