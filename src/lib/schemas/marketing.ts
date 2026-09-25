import { z } from 'zod';

export const marketingCtaUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'The destination link must use HTTPS.');

export const marketingSendSchema = z.object({
  confirmLawfulBasis: z.literal(true),
}).strict();
