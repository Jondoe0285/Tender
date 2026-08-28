import { z } from 'zod';

export const createAccountantSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40).optional(),
});

export type CreateAccountantInput = z.infer<typeof createAccountantSchema>;

export const accountantActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'reset-password']),
});
