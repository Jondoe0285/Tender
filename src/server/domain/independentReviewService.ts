import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { independentReviewPurchasedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

export const INDEPENDENT_REVIEW_VALID_MONTHS = 12;
export const INDEPENDENT_REVIEW_RENEWAL_OPEN_MONTHS = 11;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function getIndependentReviewExpiryDate(decidedAt: Date | null | undefined): Date | null {
  return decidedAt ? addMonths(decidedAt, INDEPENDENT_REVIEW_VALID_MONTHS) : null;
}

export function getIndependentReviewRenewalOpenDate(decidedAt: Date | null | undefined): Date | null {
  return decidedAt ? addMonths(decidedAt, INDEPENDENT_REVIEW_RENEWAL_OPEN_MONTHS) : null;
}

export function independentReviewRenewalAvailable(status: string, decidedAt: Date | null | undefined, now = new Date()): boolean {
  if (status !== 'APPROVED') return false;
  const renewalOpenAt = getIndependentReviewRenewalOpenDate(decidedAt);
  const expiresAt = getIndependentReviewExpiryDate(decidedAt);
  return Boolean(renewalOpenAt && expiresAt && renewalOpenAt <= now && now < expiresAt);
}

export function independentReviewExpired(status: string, decidedAt: Date | null | undefined, now = new Date()): boolean {
  if (status !== 'APPROVED') return false;
  const expiresAt = getIndependentReviewExpiryDate(decidedAt);
  return Boolean(expiresAt && expiresAt <= now);
}

/** Marks the purchase confirmed and notifies the Provider that a H&S professional will make contact. Idempotent against webhook retries. */
export async function finalizeIndependentReviewWithPayment(userId: string, paymentId: string) {
  const profile = await prisma.retailerProfile.findUnique({ where: { userId }, select: { id: true, independentReviewStatus: true } });
  if (!profile) return;
  if (profile.independentReviewStatus === 'NOT_PURCHASED' || profile.independentReviewStatus === 'DECLINED' || profile.independentReviewStatus === 'APPROVED') {
    await prisma.retailerProfile.update({
      where: { userId },
      data: { independentReviewStatus: 'PURCHASED', independentReviewTier: null, independentReviewPurchasedAt: new Date(), independentReviewDecidedAt: null, independentReviewNote: null },
    });
  }
  await recordAuditEvent({ actorId: userId, action: 'INDEPENDENT_REVIEW_PURCHASED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { paymentId } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) await sendTransactionalEmail(user.email, independentReviewPurchasedTemplate({})).catch(() => undefined);
}
