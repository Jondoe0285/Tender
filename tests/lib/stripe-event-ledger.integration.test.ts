import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import { POST } from '../../src/app/api/webhooks/stripe/route';
import { prisma } from '../../src/server/data/prisma';
import { canTransitionPayment, recordStripeEvent } from '../../src/server/payments/stripeEventLedger';

test('payment status transitions are monotonic', () => {
  assert.equal(canTransitionPayment('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransitionPayment('FAILED', 'CONFIRMED'), true);
  assert.equal(canTransitionPayment('PENDING', 'FAILED'), true);
  assert.equal(canTransitionPayment('CONFIRMED', 'FAILED'), false);
  assert.equal(canTransitionPayment('REVERSED', 'CONFIRMED'), false);
  assert.equal(canTransitionPayment('CONFIRMED', 'REVERSED'), true);
});

test('Stripe events are persisted once under the provider event ID', async (context) => {
  const suffix = randomUUID();
  const event = {
    id: `evt_ledger_${suffix}`,
    type: 'checkout.session.completed',
    data: { object: { id: `cs_${suffix}`, amount_total: 1200, currency: 'gbp' } },
  } as unknown as Stripe.Event;

  context.after(async () => {
    await prisma.stripeEvent.deleteMany({ where: { stripeEventId: event.id } });
  });

  assert.equal((await recordStripeEvent(event)).duplicate, false);
  assert.equal((await recordStripeEvent(event)).duplicate, true);
  assert.equal(await prisma.stripeEvent.count({ where: { stripeEventId: event.id } }), 1);
});

test('a signed completion event with the wrong charged total is rejected and does not confirm', async (context) => {
  const suffix = randomUUID();
  const previousSecretKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let paymentId: string | undefined;
  const webhookSecret = `whsec_${suffix}`;

  context.after(async () => {
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    await prisma.stripeEvent.deleteMany({ where: { stripeEventId: { contains: suffix } } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (retailerId) await prisma.user.deleteMany({ where: { id: retailerId } });
    if (previousSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecretKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  });

  process.env.STRIPE_SECRET_KEY = 'sk_test_payment_regression_only';
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  const retailer = await prisma.user.create({ data: { email: `vat-mismatch-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'VAT Mismatch' } });
  retailerId = retailer.id;
  const tender = await prisma.tender.create({
    data: { reference: `VAT-${suffix}`, clientId: retailerId, category: 'Construction Materials', subcategory: 'Aggregate', location: 'Leeds', quantity: '1', urgency: 'Standard', closingDate: new Date(Date.now() + 86_400_000), requirements: 'Delivery', description: 'Amount mismatch fixture' },
  });
  tenderId = tender.id;
  const payment = await prisma.payment.create({
    data: { type: 'RETAILER_UNLOCK', amountGbp: 10, vatPercentage: 20, vatGbp: 2, totalAmountGbp: 12, status: 'PENDING', userId: retailerId, tenderId },
  });
  paymentId = payment.id;

  const payload = JSON.stringify({
    id: `evt_mismatch_${suffix}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { object: 'checkout.session', metadata: { paymentId }, payment_status: 'paid', amount_total: 999, currency: 'gbp', payment_intent: null } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const response = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }));

  assert.equal(response.status, 400);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'PENDING');
  assert.equal(await prisma.stripeEvent.count({ where: { stripeEventId: `evt_mismatch_${suffix}` } }), 1);
});
