import { mobileApiFetch } from './client';

export type MobileUnlockOutcome =
  | { status: 'ALREADY_UNLOCKED' }
  | { status: 'UNLOCKED_WITH_CREDIT' }
  | { status: 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED' }
  | { status: 'PAYMENT_REQUIRED'; paymentId: string; checkoutUrl: string | null; devMode: boolean };

export async function requestTenderUnlock(tenderId: string): Promise<MobileUnlockOutcome> {
  const response = await mobileApiFetch(`/api/tenders/${encodeURIComponent(tenderId)}/unlock`, { method: 'POST', headers: { 'X-Mobile-Payment-Return': 'tradetender://payment/return' } });
  const body = await response.json().catch(() => null) as MobileUnlockOutcome | { error?: string } | null;
  if (!response.ok || !body || !('status' in body)) {
    throw new Error(body && 'error' in body && typeof body.error === 'string' ? body.error : 'Unable to unlock tender.');
  }
  return body;
}