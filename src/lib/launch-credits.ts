export const LAUNCH_CREDIT_DEFAULT_DAYS = 90;
export const PERCENTAGE_RELEASE_SECOND_APPROVER_GBP = 50;

export function defaultLaunchCreditExpiry(from = new Date()): Date {
  const expires = new Date(from.getTime());
  expires.setUTCDate(expires.getUTCDate() + LAUNCH_CREDIT_DEFAULT_DAYS);
  return expires;
}

export function effectiveLaunchCredits(left: number, expireAt: Date | string | null | undefined, now = new Date()): number {
  if (!Number.isFinite(left) || left <= 0) return 0;
  if (!expireAt) return left;
  const expiry = expireAt instanceof Date ? expireAt : new Date(expireAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now.getTime()) return 0;
  return left;
}
