import { z } from 'zod';

export const passwordResetSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(10).max(200),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
