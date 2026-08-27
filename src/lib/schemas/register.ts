import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40).optional(),
  role: z.enum(['CLIENT', 'RETAILER']),
  termsAccepted: z.literal(true, { message: 'You must accept the terms to register' }),
  companyName: z.string().trim().min(2).max(160).optional(),
  categories: z.array(z.string()).optional(),
  coverageAreas: z.string().trim().max(400).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
