import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const searchSchema = z.string().trim().min(1).max(120).optional();

export const analyticsFilterSchema = z.object({
  client: searchSchema,
  retailer: searchSchema,
  tenderReference: z.string().trim().min(1).max(64).optional(),
  quoteReference: z.string().trim().min(1).max(72).optional(),
  category: searchSchema,
  region: searchSchema,
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
  from: dateSchema,
  to: dateSchema,
  valueBand: z.enum(['UNDER_1000', '1000_TO_4999', '5000_TO_9999', '10000_PLUS']).optional(),
  subscriptionPlan: searchSchema,
  paymentStatus: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'REVERSED']).optional(),
}).strict();

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;