import { z } from 'zod';

export const issueTenderWarningSchema = z.object({
  reason: z.string().trim().min(3).max(160),
  note: z.string().trim().min(3).max(1_000),
});

export type IssueTenderWarningInput = z.infer<typeof issueTenderWarningSchema>;