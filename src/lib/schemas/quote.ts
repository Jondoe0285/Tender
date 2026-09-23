import { z } from 'zod';
import { QUOTE_PRICING_KINDS } from '@/lib/quote-pricing';

const quoteLineSchema = z.union([
  z.object({
    tenderItemId: z.string().trim().min(1),
    available: z.literal(true),
    pricingKind: z.enum(QUOTE_PRICING_KINDS).optional(),
    unitRateGbp: z.coerce.number().positive().max(1_000_000).optional(),
    priceGbp: z.coerce.number().int().positive().max(10_000_000).optional(),
  }),
  z.object({
    tenderItemId: z.string().trim().min(1),
    available: z.literal(false),
  }),
]);

const quoteChargeSchema = z.object({
  description: z.string().trim().min(1).max(120),
  priceGbp: z.coerce.number().int().positive().max(10_000_000),
});

export const submitQuoteSchema = z.object({
  lineItems: z.array(quoteLineSchema).min(1).max(50),
  charges: z.array(quoteChargeSchema).max(20).optional().default([]),
  leadTimeDays: z.coerce.number().int().nonnegative().max(365),
  deliveryDateConfirmed: z.boolean(),
  deliveryInfo: z.string().trim().min(1).max(1000),
  validityDays: z.coerce.number().int().positive().max(365).optional(),
}).refine((value) => value.lineItems.some((line) => line.available), {
  message: 'Quote at least one tender item',
  path: ['lineItems'],
}).superRefine((value, context) => {
  value.lineItems.forEach((line, index) => {
    if (line.available && line.unitRateGbp == null && line.priceGbp == null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a unit rate or a lump price', path: ['lineItems', index, 'unitRateGbp'] });
    }
  });
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;
