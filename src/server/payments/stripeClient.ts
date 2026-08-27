import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

/** Returns null when STRIPE_SECRET_KEY is not configured (local/dev without keys). */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
