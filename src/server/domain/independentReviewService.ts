import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { independentReviewPurchasedTemplate, independentReviewDecisionTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import {
  independentReviewTierRank,
  isIndependentReviewTier,
  type IndependentReviewTier,
} from '@/lib/independentReviewTiers';
import { createEnhancedVerificationInvitation, notifyConsulthubOfPurchase } from '@/server/domain/enhancedVerificationInvitationService';

export const INDEPENDENT_REVIEW_VALID_MONTHS = 12;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function getIndependentReviewExpiryDate(decidedAt: Date | null | undefined): Date | null {
  return decidedAt ? addMonths(decidedAt, INDEPENDENT_REVIEW_VALID_MONTHS) : null;
}

export function independentReviewExpired(status: string, decidedAt: Date | null | undefined, now = new Date()): boolean {
  if (status !== 'APPROVED') return false;
  const expiresAt = getIndependentReviewExpiryDate(decidedAt);
  return Boolean(expiresAt && expiresAt <= now);
}

export type IndependentReviewPurchaseState = {
  status: string;
  awardedTier: IndependentReviewTier | null;
  purchasedAt: Date | null;
  decidedAt: Date | null;
};

export function independentReviewPurchaseInFlight(state: IndependentReviewPurchaseState, now = new Date()): boolean {
  if (state.status === 'PURCHASED') return true;
  if (state.status !== 'APPROVED' || independentReviewExpired(state.status, state.decidedAt, now)) return false;
  return Boolean(state.purchasedAt && state.decidedAt && state.purchasedAt > state.decidedAt);
}

export function canPurchaseIndependentReviewTier(state: IndependentReviewPurchaseState, requested: IndependentReviewTier, now = new Date()): { allowed: boolean; reason: 'in_flight' | 'not_upgrade' | null } {
  if (independentReviewPurchaseInFlight(state, now)) return { allowed: false, reason: 'in_flight' };
  if (state.status === 'APPROVED' && !independentReviewExpired(state.status, state.decidedAt, now)) {
    if (independentReviewTierRank(requested) > independentReviewTierRank(state.awardedTier)) return { allowed: true, reason: null };
    return { allowed: false, reason: 'not_upgrade' };
  }
  return { allowed: true, reason: null };
}

export const INDEPENDENT_REVIEW_RESET_DATA = {
  independentReviewStatus: 'NOT_PURCHASED' as const,
  independentReviewTier: null,
  independentReviewPurchasedTier: null,
  independentReviewPurchasedPaymentId: null,
  independentReviewNote: 'Service scope changed: enhanced verification reset due to the addition of new legal and compliance requirements.',
};

/** Marks the purchase confirmed and notifies Consulthub. Idempotent against webhook retries. */
export async function finalizeIndependentReviewWithPayment(userId: string, paymentId: string) {
  const [profile, payment] = await Promise.all([
    prisma.retailerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        independentReviewStatus: true,
        independentReviewTier: true,
        independentReviewPurchasedAt: true,
        independentReviewDecidedAt: true,
        companyName: true,
      },
    }),
    prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, independentReviewTier: true, status: true, type: true, reversals: { select: { id: true } } },
    }),
  ]);
  if (!profile || !payment || payment.type !== 'INDEPENDENT_REVIEW' || payment.status !== 'CONFIRMED' || payment.reversals.length > 0) return;
  const purchasedTier = isIndependentReviewTier(payment.independentReviewTier) ? payment.independentReviewTier : null;
  if (!purchasedTier) return;

  const keepAwarded = profile.independentReviewStatus === 'APPROVED' && !independentReviewExpired(profile.independentReviewStatus, profile.independentReviewDecidedAt);
  await prisma.retailerProfile.update({
    where: { userId },
    data: {
      independentReviewStatus: keepAwarded ? 'APPROVED' : 'PURCHASED',
      independentReviewTier: keepAwarded ? profile.independentReviewTier : null,
      independentReviewPurchasedTier: purchasedTier,
      independentReviewPurchasedPaymentId: paymentId,
      independentReviewPurchasedAt: new Date(),
      independentReviewDecidedAt: keepAwarded ? profile.independentReviewDecidedAt : null,
      independentReviewNote: keepAwarded ? undefined : null,
    },
  });
  await recordAuditEvent({ actorId: userId, action: 'INDEPENDENT_REVIEW_PURCHASED', targetType: 'RetailerProfile', targetId: profile.id, metadata: { paymentId, purchasedTier } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, contactName: true } });
  if (user) {
    await sendTransactionalEmail(user.email, independentReviewPurchasedTemplate({ tier: purchasedTier })).catch(() => undefined);
    try {
      const invitation = await createEnhancedVerificationInvitation({
        userId,
        paymentId,
        recipientEmail: user.email,
        recipientName: user.contactName,
        purchasedTier,
      });
      await notifyConsulthubOfPurchase({
        invitation,
        userId,
        paymentId,
        purchasedTier,
        companyName: profile.companyName,
        recipientEmail: user.email,
      });
    } catch (error) {
      await recordAuditEvent({
        actorId: userId,
        action: 'ENHANCED_VERIFICATION_OUTBOUND_FAILED',
        targetType: 'Payment',
        targetId: paymentId,
        metadata: { reason: error instanceof Error ? error.message : 'Outbound onboarding failed', purchasedTier },
      });
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }
}

export async function revokeIndependentReviewForPayment(paymentId: string) {
  const profile = await prisma.retailerProfile.findFirst({
    where: { independentReviewPurchasedPaymentId: paymentId },
    select: {
      id: true,
      userId: true,
      independentReviewStatus: true,
      independentReviewTier: true,
      independentReviewDecidedAt: true,
    },
  });
  if (!profile) return;

  const previous = await prisma.payment.findFirst({
    where: {
      id: { not: paymentId },
      userId: profile.userId,
      type: 'INDEPENDENT_REVIEW',
      status: 'CONFIRMED',
      independentReviewTier: { not: null },
      reversals: { none: {} },
    },
    orderBy: { confirmedAt: 'desc' },
    select: { id: true, independentReviewTier: true },
  });

  if (previous?.independentReviewTier && profile.independentReviewTier && independentReviewTierRank(profile.independentReviewTier) <= independentReviewTierRank(previous.independentReviewTier) && profile.independentReviewStatus === 'APPROVED' && !independentReviewExpired(profile.independentReviewStatus, profile.independentReviewDecidedAt)) {
    await prisma.retailerProfile.update({
      where: { id: profile.id },
      data: {
        independentReviewPurchasedPaymentId: previous.id,
        independentReviewPurchasedTier: previous.independentReviewTier,
      },
    });
    return;
  }

  await prisma.retailerProfile.update({
    where: { id: profile.id },
    data: {
      independentReviewStatus: 'NOT_PURCHASED',
      independentReviewTier: null,
      independentReviewPurchasedTier: null,
      independentReviewPurchasedPaymentId: null,
      independentReviewNote: 'Enhanced verification removed after the related payment was reversed.',
    },
  });
}

export async function notifyIndependentReviewDecision(email: string, input: { approved: boolean; tier?: IndependentReviewTier | null }) {
  await sendTransactionalEmail(email, independentReviewDecisionTemplate(input)).catch(() => undefined);
}
