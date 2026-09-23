import { isValidEmail } from '@/lib/email-format';

/** Public support address shown in the footer and policy pages. Empty when not configured. */
export function supportEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || '';
  return isValidEmail(value) ? value : null;
}
