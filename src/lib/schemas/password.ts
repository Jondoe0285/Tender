import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password must be no more than 200 characters')
  .regex(/[A-Z]/, 'Password must include at least one capital letter')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character');