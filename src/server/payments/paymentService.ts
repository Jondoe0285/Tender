import { prisma } from '@/server/data/prisma';
import { getStripeClient, isStripeConfigured } from '@/server/payments/stripeClient';
import type { PaymentType } from '@prisma/client';

type CreatePaymentResult = {
  paymentId: string;
  /** Present only when Stripe is configured — the client must redirect here to pay. */
  checkoutUrl: string | null;
  /** True when running without Stripe keys: the caller may use the dev-only confirm endpoint. */
  devMode: boolean;
};

/**
 * Creates a PENDING payment record and, when Stripe is configured, a matching Checkout Session.
 * Without Stripe keys (local/dev only) the payment stays PENDING until the dev-only confirm
 * endpoint is called — this path must never be reachable in production (see confirmPayment).
 */
export async function createPayment(params: {
  type: PaymentType;
  amountGbp: number;
  userId: string;
  quoteId?: string;
}): Promise<CreatePaymentResult> {
  const payment = await prisma.payment.create({
    data: {
      type: params.type,
      amountGbp: params.amountGbp,
      userId: params.userId,
      quoteId: params.quoteId,
      status: 'PENDING',
    },
  });

  const stripe = getStripeClient();
  if (!stripe) {
    return { paymentId: payment.id, checkoutUrl: null, devMode: true };
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: params.amountGbp * 100,
          product_data: { name: params.type === 'RETAILER_UNLOCK' ? 'Tender unlock fee' : 'Accepted quote release fee' },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/payment/success?payment_id=${payment.id}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/payment/cancelled?payment_id=${payment.id}`,
    metadata: { paymentId: payment.id },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: checkoutSession.id, stripeCheckoutUrl: checkoutSession.url },
  });

  return { paymentId: payment.id, checkoutUrl: checkoutSession.url, devMode: false };
}

/**
 * Confirms a payment as CONFIRMED. In production this must only ever be invoked from a
 * signature-verified Stripe webhook (see /api/webhooks/stripe). The dev-only confirmation
 * route refuses to run when Stripe is configured or NODE_ENV is production.
 */
export async function confirmPayment(paymentId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: 'PENDING' },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
  });
}

export function devPaymentConfirmationAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && !isStripeConfigured();
}
