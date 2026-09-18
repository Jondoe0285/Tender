import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';

export const createAccountantSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: passwordSchema,
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40).optional(),
});

export type CreateAccountantInput = z.infer<typeof createAccountantSchema>;

export const accountantActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'reset-password']),
});
