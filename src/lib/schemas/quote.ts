import { z } from 'zod';

const quoteLineSchema = z.discriminatedUnion('available', [
  z.object({
    tenderItemId: z.string().trim().min(1),
    available: z.literal(true),
    priceGbp: z.coerce.number().int().positive().max(10_000_000),
  }),
  z.object({
    tenderItemId: z.string().trim().min(1),
    available: z.literal(false),
  }),
]);

const quoteChargeSchema = z.object({
  description: z.string().trim().min(2).max(120),
  priceGbp: z.coerce.number().int().positive().max(10_000_000),
});

export const submitQuoteSchema = z.object({
  lineItems: z.array(quoteLineSchema).min(1).max(50),
  charges: z.array(quoteChargeSchema).max(20).optional().default([]),
  leadTimeDays: z.coerce.number().int().nonnegative().max(365),
  deliveryDateConfirmed: z.boolean(),
  deliveryInfo: z.string().trim().min(5).max(1000),
  validityDays: z.coerce.number().int().positive().max(365),
}).refine((value) => value.lineItems.some((line) => line.available), {
  message: 'Quote at least one tender item',
  path: ['lineItems'],
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;
