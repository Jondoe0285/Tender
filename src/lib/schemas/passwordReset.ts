import { z } from 'zod';

export const passwordResetSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(10).max(200),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
