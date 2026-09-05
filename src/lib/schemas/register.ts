import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
  contactName: z.string().trim().min(2).max(120),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  role: z.literal('USER'),
  termsAccepted: z.literal(true, { message: 'You must accept the terms to register' }),
  companyName: z.string().trim().min(2).max(160).optional(),
  branchIdentifier: z.string().trim().min(2).max(120).optional(),
  categories: z.array(z.string()).optional(),
  coverageAreas: z.string().trim().max(400).optional(),
  coverageScope: z.enum(['COUNTY', 'REGION', 'UK']).optional(),
  counties: z.array(z.string()).max(60).optional(),
  regions: z.array(z.string()).max(20).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
