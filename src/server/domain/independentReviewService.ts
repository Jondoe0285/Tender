import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { independentReviewPurchasedTemplate, independentReviewRenewalReminderTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { getIndependentReviewRenewalFeeGbp, isIndependentReviewRenewalActive } from '@/server/domain/platformSettings';

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

export async function sendIndependentReviewRenewalReminders(now = new Date()) {
  if (!await isIndependentReviewRenewalActive()) return { scanned: 0, sent: 0, skipped: 0 };
  const renewalFeeGbp = await getIndependentReviewRenewalFeeGbp();
  const profiles = await prisma.retailerProfile.findMany({
    where: { independentReviewStatus: 'APPROVED', independentReviewDecidedAt: { not: null } },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          contactName: true,
          primaryClientCompany: { select: { companyName: true, primaryUser: { select: { id: true, email: true, contactName: true } } } },
          clientCompanyMembership: { select: { company: { select: { companyName: true, primaryUser: { select: { id: true, email: true, contactName: true } } } } } },
        },
      },
    },
  });
  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const expiresAt = getIndependentReviewExpiryDate(profile.independentReviewDecidedAt);
    const reminderAt = getIndependentReviewRenewalOpenDate(profile.independentReviewDecidedAt);
    if (!expiresAt || !reminderAt || reminderAt > now || expiresAt <= now) {
      skipped += 1;
      continue;
    }
    const existing = await prisma.auditLog.findFirst({
      where: { action: 'INDEPENDENT_REVIEW_RENEWAL_REMINDER_SENT', targetType: 'RetailerProfile', targetId: profile.id, metadata: { contains: expiresAt.toISOString() } },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const company = profile.user.primaryClientCompany ?? profile.user.clientCompanyMembership?.company ?? null;
    const primaryContact = company?.primaryUser ?? profile.user;
    const companyName = company?.companyName ?? profile.companyName;
    const template = independentReviewRenewalReminderTemplate({ companyName, expiryDate: expiresAt, renewalFeeGbp, renewalPath: '/retailer/independent-review?renewal=1' });
    const result = await sendTransactionalEmail(primaryContact.email, template).catch((error: unknown) => ({ sent: false as const, reason: error instanceof Error ? error.message : 'Email delivery failed' }));
    await recordAuditEvent({
      actorId: null,
      action: result.sent ? 'INDEPENDENT_REVIEW_RENEWAL_REMINDER_SENT' : 'INDEPENDENT_REVIEW_RENEWAL_REMINDER_FAILED',
      targetType: 'RetailerProfile',
      targetId: profile.id,
      metadata: { expiresAt: expiresAt.toISOString(), renewalFeeGbp, recipientEmail: primaryContact.email, recipientUserId: primaryContact.id, reason: result.sent ? undefined : result.reason },
    });
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  return { scanned: profiles.length, sent, skipped };
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
