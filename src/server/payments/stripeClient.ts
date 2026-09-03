import Stripe from 'stripe';

const PLACEHOLDER_SECRET_VALUES = new Set(['test', 'placeholder', 'changeme', 'example']);

let stripeClient: Stripe | null = null;

function hasUsableSecret(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && !PLACEHOLDER_SECRET_VALUES.has(trimmed.toLowerCase()));
}

/** Returns null when STRIPE_SECRET_KEY is not configured or is only a local placeholder. */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!hasUsableSecret(key)) return null;
  const usableKey = key!;
  if (!stripeClient) {
    stripeClient = new Stripe(usableKey);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return hasUsableSecret(process.env.STRIPE_SECRET_KEY);
}
