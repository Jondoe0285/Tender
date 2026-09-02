import { prisma } from '@/server/data/prisma';
import { getStripeClient, isStripeConfigured } from '@/server/payments/stripeClient';
import type { PaymentType } from '@prisma/client';
import { buildPaymentAmounts, getClientReleaseFeeGbp, getPaymentFeeGbp, getVatPercentage } from '@/server/domain/platformSettings';
import { appUrl } from '@/server/config/appUrl';

type CreatePaymentResult = {
  paymentId: string;
  amountGbp: number;
  vatPercentage: number;
  vatGbp: number;
  totalAmountGbp: number;
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
  userId: string;
  tenderId?: string;
  tierId?: string;
  quoteId?: string;
  quotePriceGbp?: number;
}): Promise<CreatePaymentResult> {
  let netFeeGbp: number;
  if (params.type === 'MEMBERSHIP_TIER') {
    const tier = params.tierId
      ? await prisma.membershipTier.findUnique({ where: { id: params.tierId }, select: { monthlyPriceGbp: true, active: true } })
      : null;
    if (!tier?.active) throw new Error('Membership tier is not available');
    netFeeGbp = tier.monthlyPriceGbp;
  } else {
    netFeeGbp = params.type === 'CLIENT_RELEASE' && params.quotePriceGbp !== undefined
      ? await getClientReleaseFeeGbp(params.quotePriceGbp)
      : await getPaymentFeeGbp(params.type);
  }
  const vatPercentage = await getVatPercentage();
  const { amountGbp, vatGbp, totalAmountGbp, netPence, vatPence } = buildPaymentAmounts(netFeeGbp, vatPercentage);
  const payment = await prisma.payment.create({
    data: {
      type: params.type,
      amountGbp,
      vatPercentage,
      vatGbp,
      totalAmountGbp,
      userId: params.userId,
      tenderId: params.tenderId,
      tierId: params.tierId,
      quoteId: params.quoteId,
      status: 'PENDING',
    },
  });

  const stripe = getStripeClient();
  if (!stripe) {
    return { paymentId: payment.id, amountGbp, vatPercentage, vatGbp, totalAmountGbp, checkoutUrl: null, devMode: true };
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: netPence,
          product_data: { name: `${params.type === 'RETAILER_UNLOCK' ? 'Tender unlock fee' : params.type === 'SPONSORED_PLACEMENT' ? 'Sponsored placement fee' : params.type === 'MEMBERSHIP_TIER' ? 'Membership tier' : 'Accepted quote release fee'} (excl. VAT)` },
        },
        quantity: 1,
      },
      ...(vatPence > 0 ? [{
        price_data: {
          currency: 'gbp',
          unit_amount: vatPence,
          product_data: { name: `VAT (${vatPercentage}%)` },
        },
        quantity: 1,
      }] : []),
    ],
    success_url: appUrl(`/payment/success?payment_id=${payment.id}`),
    cancel_url: appUrl(`/payment/cancelled?payment_id=${payment.id}`),
    metadata: { paymentId: payment.id, vatPercentage: String(vatPercentage) },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripeCheckoutSessionId: checkoutSession.id,
      stripePaymentIntentId: typeof checkoutSession.payment_intent === 'string' ? checkoutSession.payment_intent : null,
      stripeCheckoutUrl: checkoutSession.url,
    },
  });

  return { paymentId: payment.id, amountGbp, vatPercentage, vatGbp, totalAmountGbp, checkoutUrl: checkoutSession.url, devMode: false };
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
