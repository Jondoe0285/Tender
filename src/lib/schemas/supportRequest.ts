import { z } from 'zod';

export const supportRequestSchema = z.object({
  type: z.enum(['SUPPORT', 'CHANGE', 'PAYMENT', 'DATA_PRIVACY']),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(2_000),
});

export const supportRequestReviewSchema = z.object({
  action: z.enum(['triage', 'approve', 'reject', 'resolve']),
  note: z.string().trim().min(5).max(1_000),
});