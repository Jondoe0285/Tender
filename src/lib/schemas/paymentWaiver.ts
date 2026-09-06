import { z } from 'zod';

const feeTypeSchema = z.enum(['RETAILER_UNLOCK', 'CLIENT_RELEASE']);

export const grantPaymentWaiverSchema = z.object({
  userId: z.string().cuid(),
  feeType: feeTypeSchema,
  reason: z.string().trim().min(10).max(1000),
  expiresAt: z.string().datetime().optional().nullable(),
}).superRefine((value, context) => {
  if (value.expiresAt && new Date(value.expiresAt) <= new Date()) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be in the future' });
  }
});

export const revokePaymentWaiverSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export type GrantPaymentWaiverInput = z.infer<typeof grantPaymentWaiverSchema>;