import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/server/payments/stripeClient';
import { confirmPayment } from '@/server/payments/paymentService';
import { prisma } from '@/server/data/prisma';
import { recordAuditEvent } from '@/server/audit/auditLog';

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      // Idempotent: only transitions a still-PENDING payment, safe against webhook retries/replays.
      await confirmPayment(paymentId);
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      await recordAuditEvent({
        actorId: null,
        action: 'PAYMENT_CONFIRMED',
        targetType: 'Payment',
        targetId: paymentId,
        metadata: { stripeEventId: event.id, type: payment?.type },
      });
    }
  }

  return NextResponse.json({ received: true });
}
