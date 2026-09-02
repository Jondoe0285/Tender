import { z } from 'zod';

export const createLegalHoldSchema = z.object({
  scope: z.enum(['TENDER', 'QUOTE', 'TENDER_ATTACHMENT']),
  targetId: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(10).max(1000),
});

export const releaseLegalHoldSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export type CreateLegalHoldInput = z.infer<typeof createLegalHoldSchema>;