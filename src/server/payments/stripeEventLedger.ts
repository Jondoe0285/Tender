import { Prisma, type PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { prisma } from '@/server/data/prisma';

export function stripeObjectId(event: Stripe.Event): string {
  const object = event.data.object as { id?: string };
  return typeof object.id === 'string' ? object.id : event.id;
}

export function stripeAmountPence(event: Stripe.Event): number | null {
  const object = event.data.object as { amount_total?: number | null; amount?: number | null };
  if (typeof object.amount_total === 'number') return object.amount_total;
  if (typeof object.amount === 'number') return object.amount;
  return null;
}

export function stripeCurrency(event: Stripe.Event): string | null {
  const object = event.data.object as { currency?: string };
  return typeof object.currency === 'string' ? object.currency.toLowerCase() : null;
}

/** Inserts one ledger row per Stripe event ID. Duplicate deliveries do not create a second row. */
export async function recordStripeEvent(event: Stripe.Event, paymentId?: string | null) {
  try {
    await prisma.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        stripeObjectId: stripeObjectId(event),
        paymentId: paymentId ?? null,
        currency: stripeCurrency(event),
        amountTotalPence: stripeAmountPence(event),
      },
    });
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicate: true };
    }
    throw error;
  }
}

/**
 * Payment status is monotonic: REVERSED is terminal, FAILED cannot overwrite CONFIRMED,
 * and completion may recover FAILED back to CONFIRMED.
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false;
  if (from === 'REVERSED') return false;
  if (to === 'CONFIRMED') return from === 'PENDING' || from === 'FAILED';
  if (to === 'FAILED') return from === 'PENDING';
  if (to === 'REVERSED') return from === 'PENDING' || from === 'CONFIRMED' || from === 'FAILED';
  return false;
}
