import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/server/payments/stripeClient';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';
import { paymentConfirmationTemplate, failedPaymentTemplate } from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

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

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_failed' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      const confirmed = event.type === 'checkout.session.completed';
      await prisma.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: confirmed ? { status: 'CONFIRMED', confirmedAt: new Date() } : { status: 'FAILED' },
      });
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: { select: { email: true } },
          quote: { select: { reference: true, tender: { select: { id: true } } } },
          unlock: { select: { tender: { select: { reference: true, id: true } } } },
        },
      });
      await recordAuditEvent({
        actorId: null,
        action: confirmed ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED',
        targetType: 'Payment',
        targetId: paymentId,
        metadata: { stripeEventId: event.id, type: payment?.type, status: payment?.status },
      });

      if (payment) {
        const reference = payment.quote?.reference ?? payment.unlock?.tender.reference ?? paymentId;
        const accountPath = payment.type === 'RETAILER_UNLOCK' ? '/retailer/billing' : '/client/billing';
        const template = confirmed
          ? paymentConfirmationTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, reference, accountPath })
          : failedPaymentTemplate({ paymentType: payment.type === 'RETAILER_UNLOCK' ? 'Retailer tender unlock fee' : 'Client Accepted Quote Release Fee', amountGbp: payment.amountGbp, reference, retryPath: accountPath });
        await sendTransactionalEmail(payment.user.email, template).catch(() => undefined);
      }
    }
  }

  return NextResponse.json({ received: true });
}
