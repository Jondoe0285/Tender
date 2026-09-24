import { clearMobileSession, loadMobileSession } from '../auth/session';
import { mobileApiBaseUrl } from './config';

export const MOBILE_PAYMENT_RETURN = 'tradetender://payment/return';

export function paymentReturnHeaders(): Record<string, string> {
  return { 'X-Mobile-Payment-Return': MOBILE_PAYMENT_RETURN };
}

export async function readErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return typeof body?.error === 'string' && body.error.trim() ? body.error : fallback;
}

export async function publicApiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${mobileApiBaseUrl()}${path}`, init);
}

export async function mobileApiFetch(path: string, init: RequestInit = {}) {
  const session = await loadMobileSession();
  if (!session) throw new Error('Sign in is required.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.accessToken}`);
  const response = await fetch(`${mobileApiBaseUrl()}${path}`, { ...init, headers });
  if (response.status === 401) {
    await clearMobileSession();
    throw new Error('Your session has expired. Sign in again.');
  }
  return response;
}

export async function revokeMobileSession() {
  try {
    await mobileApiFetch('/api/mobile/auth/logout', { method: 'POST' });
  } finally {
    await clearMobileSession();
  }
}
