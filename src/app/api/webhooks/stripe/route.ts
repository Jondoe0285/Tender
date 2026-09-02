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
          paymentReversedTemplate({ paymentType: reversal.paymentType, reference: reversal.paymentId, reversalType: 'REFUND', accountPath: '/policies#payments' })
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
          paymentReversedTemplate({ paymentType: reversal.paymentType, reference: reversal.paymentId, reversalType: 'DISPUTE', accountPath: '/policies#payments' })
        )));
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const confirmed = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
      const paymentBeforeUpdate = await prisma.payment.findUnique({ where: { id: paymentId } });
      // A delivery can fail after recording the event but before granting its entitlement. Allow
      // Stripe to retry that same signed event so the idempotent finalisers can resume safely.
      if (!paymentBeforeUpdate || (paymentBeforeUpdate.stripeEventId && paymentBeforeUpdate.stripeEventId !== event.id)) {
        return NextResponse.json({ received: true });
      }
      if (confirmed && event.type !== 'payment_intent.payment_failed' && session.amount_total !== null && session.amount_total !== Math.round(paymentBeforeUpdate.totalAmountGbp * 100)) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
      }
      const receiptUrl = confirmed ? await getReceiptUrl(stripe, session).catch(() => null) : null;
      const updated = await prisma.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: confirmed
          ? { status: 'CONFIRMED', confirmedAt: new Date(), stripeEventId: event.id, stripeReceiptUrl: receiptUrl, accountingRecordPath: `accounting/stripe/${new Date().getUTCFullYear()}/${paymentId}.json` }
          : { status: 'FAILED', stripeEventId: event.id },
      });
      if (updated.count === 0 && paymentBeforeUpdate.status !== 'CONFIRMED') return NextResponse.json({ received: true });
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: { select: { email: true } },
          quote: { select: { reference: true, tender: { select: { id: true } } } },
          unlock: { select: { tender: { select: { reference: true, id: true } } } },
        },
      });
      if (confirmed && payment) {
        if (payment.type === 'RETAILER_UNLOCK' && payment.tenderId) await finalizeUnlockWithPayment(payment.userId, payment.tenderId, payment.id);
        if (payment.type === 'CLIENT_RELEASE' && payment.quoteId) await finalizeContactRelease(payment.userId, payment.quoteId, payment.id);
        if (payment.type === 'SPONSORED_PLACEMENT') await finalizeSponsoredPlacementWithPayment(payment.userId, payment.id);
        if (payment.type === 'MEMBERSHIP_TIER' && payment.tierId) await finalizeMembershipTierWithPayment(payment.userId, payment.tierId, payment.id);
      }
      const paymentAuditAction = confirmed ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED';
      const existingPaymentAudit = await prisma.auditLog.findFirst({
        where: { action: paymentAuditAction, targetType: 'Payment', targetId: paymentId, metadata: { contains: event.id } },
        select: { id: true },
      });
      if (!existingPaymentAudit) {
        await recordAuditEvent({
          actorId: null,
          action: paymentAuditAction,
          targetType: 'Payment',
          targetId: paymentId,
          metadata: { stripeEventId: event.id, type: payment?.type, status: payment?.status },
        });
      }

      if (payment) {
        const reference = payment.quote?.reference ?? payment.unlock?.tender.reference ?? paymentId;
        const accountPath = payment.type === 'CLIENT_RELEASE' ? '/client/billing' : '/retailer/billing';
        const template = confirmed
          ? paymentConfirmationTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored placement fee' : payment.type === 'MEMBERSHIP_TIER' ? 'Membership tier' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, vatGbp: payment.vatGbp, totalAmountGbp: payment.totalAmountGbp, reference, accountPath })
          : failedPaymentTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : payment.type === 'SPONSORED_PLACEMENT' ? 'Sponsored placement fee' : payment.type === 'MEMBERSHIP_TIER' ? 'Membership tier' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, vatGbp: payment.vatGbp, totalAmountGbp: payment.totalAmountGbp, reference, retryPath: accountPath });
        await sendTransactionalEmail(payment.user.email, template).catch(() => undefined);
      }
    }
  }

  return NextResponse.json({ received: true });
}
