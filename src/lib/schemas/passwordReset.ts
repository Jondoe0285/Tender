import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';

export const passwordResetSchema = z.object({
  token: z.string().min(1).max(200),
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
