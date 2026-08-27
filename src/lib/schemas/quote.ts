import { z } from 'zod';

export const submitQuoteSchema = z.object({
  priceGbp: z.coerce.number().int().positive().max(10_000_000),
  leadTimeDays: z.coerce.number().int().nonnegative().max(365),
  deliveryInfo: z.string().trim().min(5).max(1000),
  accreditations: z.string().trim().min(2).max(1000),
  supportingDocumentName: z.string().trim().max(255).optional(),
  validityDays: z.coerce.number().int().positive().max(365),
  notes: z.string().trim().min(5).max(2000),
});

export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;
