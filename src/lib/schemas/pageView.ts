import { z } from 'zod';

// Only in-app portal routes are tracked — never arbitrary client-supplied strings.
export const pageViewSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\/(client|retailer|super-user)(\/[a-zA-Z0-9\-_/]*)?$/, 'Unsupported path'),
});

export type PageViewInput = z.infer<typeof pageViewSchema>;
