import { createHmac, timingSafeEqual } from 'node:crypto';
import { appUrl } from '@/server/config/appUrl';
import { isValidEmail } from '@/lib/email-format';

type UnsubscribePayload = { email: string };

export function marketingUnsubscribeUrl(email: string): string {
  return appUrl(`/unsubscribe/marketing?token=${encodeURIComponent(signUnsubscribeToken(email))}`);
}

export function marketingUnsubscribeApiUrl(email: string): string {
  return appUrl(`/api/marketing/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email))}`);
}

export function signUnsubscribeToken(email: string): string {
  const normalised = email.trim().toLowerCase();
  const payload = Buffer.from(JSON.stringify({ email: normalised } satisfies UnsubscribePayload), 'utf8').toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

export function readUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = hmac(payload);
  const presented = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (presented.length !== wanted.length || !timingSafeEqual(presented, wanted)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UnsubscribePayload;
    if (!isValidEmail(parsed.email ?? '')) return null;
    return parsed.email.trim().toLowerCase();
  } catch {
    return null;
  }
}

function hmac(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error('NEXTAUTH_SECRET is not configured.');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
