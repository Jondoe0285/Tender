import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/server/payments/stripeClient';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { paymentConfirmationTemplate, failedPaymentTemplate, paymentReversedTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';
import { finalizeUnlockWithPayment } from '@/server/domain/unlockService';
import { finalizeContactRelease } from '@/server/domain/contactReleaseService';
import { finalizeSponsoredPlacementWithPayment } from '@/server/domain/sponsoredPlacementService';
import { finalizeMembershipTierWithPayment } from '@/server/domain/membershipService';
import { finalizeIndependentReviewWithPayment } from '@/server/domain/independentReviewService';
import { finalizeDirectContactWithPayment } from '@/server/domain/directContactService';
import { reversePaymentEntitlements } from '@/server/payments/paymentReversalService';

async function getReceiptUrl(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string | null> {
  if (typeof session.payment_intent !== 'string') return null;
  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ['latest_charge'] });
  const charge = paymentIntent.latest_charge;
  return charge && typeof charge !== 'string' ? charge.receipt_url ?? null : null;
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 501 });
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Signature is verified against the raw payload — never trust an unverified body.
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    if (charge.refunded && typeof charge.payment_intent === 'string') {
      const reversal = await reversePaymentEntitlements({
        stripePaymentIntentId: charge.payment_intent,
        stripeEventId: event.id,
        providerObjectId: charge.id,
        type: 'REFUND',
      });
      if (reversal) {
        const users = await prisma.user.findMany({ where: { id: { in: reversal.affectedUserIds } }, select: { email: true } });
        await Promise.allSettled(users.map((user) => sendTransactionalEmail(
          user.email,
          paymentReversedTemplate({ paymentType: reversal.paymentType, reference: reversal.paymentId, reversalType: 'REFUND', accountPath: '/policies/payments' })
        )));
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    if (typeof dispute.payment_intent === 'string') {
      const reversal = await reversePaymentEntitlements({
        stripePaymentIntentId: dispute.payment_intent,
        stripeEventId: event.id,
        providerObjectId: dispute.id,
        type: 'DISPUTE',
      });
      if (reversal) {
        const users = await prisma.user.findMany({ where: { id: { in: reversal.affectedUserIds } }, select: { email: true } });
        await Promise.allSettled(users.map((user) => sendTransactionalEmail(
          user.email,
          paymentReversedTemplate({ paymentType: reversal.paymentType, reference: reversal.paymentId, reversalType: 'DISPUTE', accountPath: '/policies/payments' })
        )));
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: paymentIntent.id }, select: { id: true } });
    if (!payment) return NextResponse.json({ received: true });
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'FAILED', stripeEventId: event.id },
    });
    if (updated.count > 0) {
      await recordAuditEvent({ actorId: null, action: 'PAYMENT_FAILED', targetType: 'Payment', targetId: payment.id, metadata: { stripeEventId: event.id, type: 'PAYMENT_INTENT' } });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const confirmed = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
      if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
        return NextResponse.json({ received: true });
      }
      const paymentBeforeUpdate = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!paymentBeforeUpdate) {
        return NextResponse.json({ received: true });
      }
      if (confirmed && session.currency && session.currency !== 'gbp') {
        return NextResponse.json({ error: 'Payment currency mismatch' }, { status: 400 });
      }
      if (confirmed && paymentBeforeUpdate.stripePaymentIntentId && typeof session.payment_intent === 'string' && paymentBeforeUpdate.stripePaymentIntentId !== session.payment_intent) {
        return NextResponse.json({ error: 'Payment intent mismatch' }, { status: 400 });
      }
      if (confirmed && session.amount_total !== null && session.amount_total !== Math.round(paymentBeforeUpdate.totalAmountGbp * 100)) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
      }
      const receiptUrl = confirmed ? await getReceiptUrl(stripe, session).catch(() => null) : null;
      const updated = await prisma.payment.updateMany({
        where: { id: paymentId, status: confirmed ? { in: ['PENDING', 'FAILED'] } : 'PENDING' },
        data: confirmed
          ? { status: 'CONFIRMED', confirmedAt: new Date(), stripeEventId: event.id, stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : paymentBeforeUpdate.stripePaymentIntentId, stripeReceiptUrl: receiptUrl, accountingRecordPath: `accounting/stripe/${new Date().getUTCFullYear()}/${paymentId}.json` }
          : { status: 'FAILED', stripeEventId: event.id },
      });
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: { select: { email: true } },
          quote: { select: { reference: true, tender: { select: { id: true } } } },
          unlock: { select: { tender: { select: { reference: true, id: true } } } },
        },
      });
      const paymentAuditAction = confirmed ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED';
      const existingPaymentAudit = await prisma.auditLog.findFirst({
        where: { action: paymentAuditAction, targetType: 'Payment', targetId: paymentId, metadata: { contains: event.id } },
        select: { id: true },
      });
      // A retry after a partial failure (payment already marked CONFIRMED but entitlement
      // finalisation previously threw) must resume here instead of stopping silently. Skip only
      // when this exact event was already fully processed, or the transition genuinely did not
      // apply (e.g. the payment was reversed out of order, or a failure event arrived stale).
      const shouldProcess = confirmed ? payment?.status === 'CONFIRMED' && !existingPaymentAudit : updated.count > 0;
      if (!shouldProcess) return NextResponse.json({ received: true });
      if (confirmed && payment) {
        if (payment.type === 'RETAILER_UNLOCK' && payment.tenderId) await finalizeUnlockWithPayment(payment.userId, payment.tenderId, payment.id);
        if (payment.type === 'CLIENT_RELEASE' && payment.quoteId) await finalizeContactRelease(payment.userId, payment.quoteId, payment.id);
        if (payment.type === 'SPONSORED_PLACEMENT') await finalizeSponsoredPlacementWithPayment(payment.userId, payment.id);
        if (payment.type === 'MEMBERSHIP_TIER' && payment.tierId) await finalizeMembershipTierWithPayment(payment.userId, payment.tierId, payment.id);
        if (payment.type === 'INDEPENDENT_REVIEW') await finalizeIndependentReviewWithPayment(payment.userId, payment.id);
        if (payment.type === 'DIRECT_CONTACT') await finalizeDirectContactWithPayment(payment.userId, payment.id);
      }
      if (!existingPaymentAudit) {
        await recordAuditEvent({
          actorId: null,
          action: paymentAuditAction,
          targetType: 'Payment',
          targetId: paymentId,
          metadata: { stripeEventId: event.id, type: payment?.type, status: payment?.status },
        });
      }

      if (payment && payment.type !== 'INDEPENDENT_REVIEW') {
        const reference = payment.quote?.reference ?? payment.unlock?.tender.reference ?? paymentId;
        const accountPath = payment.type === 'CLIENT_RELEASE' ? '/client/billing' : '/retailer/billing';
        const template = confirmed
          ? paymentConfirmationTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored placement fee' : payment.type === 'MEMBERSHIP_TIER' ? 'Membership tier' : payment.type === 'DIRECT_CONTACT' ? 'Direct contact request fee' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, vatGbp: payment.vatGbp, totalAmountGbp: payment.totalAmountGbp, reference, accountPath })
          : failedPaymentTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored placement fee' : payment.type === 'MEMBERSHIP_TIER' ? 'Membership tier' : payment.type === 'DIRECT_CONTACT' ? 'Direct contact request fee' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, vatGbp: payment.vatGbp, totalAmountGbp: payment.totalAmountGbp, reference, retryPath: accountPath });
        await sendTransactionalEmail(payment.user.email, template).catch(() => undefined);
      }
    }
  }

  return NextResponse.json({ received: true });
}
