import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';

export const createSuperUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: passwordSchema,
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().max(40).optional(),
  isOwner: z.boolean().optional(),
});

export type CreateSuperUserInput = z.infer<typeof createSuperUserSchema>;

export const superUserActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'reset-password', 'grant-owner', 'revoke-owner']),
});
