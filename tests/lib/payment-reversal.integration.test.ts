import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import { POST } from '../../src/app/api/webhooks/stripe/route';
import { prisma } from '../../src/server/data/prisma';
import { reversePaymentEntitlements } from '../../src/server/payments/paymentReversalService';

test('a refund revokes the paid unlock and duplicate Stripe delivery is idempotent', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let paymentId: string | undefined;

  context.after(async () => {
    if (paymentId) await prisma.paymentReversal.deleteMany({ where: { paymentId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const [client, retailer] = await Promise.all([
    prisma.user.create({ data: { email: `reversal-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Reversal Client' } }),
    prisma.user.create({ data: { email: `reversal-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Reversal Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;

  const tender = await prisma.tender.create({
    data: {
      reference: `REV-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional payment reversal test tender',
    },
  });
  tenderId = tender.id;

  const payment = await prisma.payment.create({
    data: {
      type: 'RETAILER_UNLOCK',
      amountGbp: 10,
      vatPercentage: 20,
      vatGbp: 2,
      totalAmountGbp: 12,
      status: 'CONFIRMED',
      userId: retailerId,
      tenderId,
      stripePaymentIntentId: `pi_${suffix}`,
      confirmedAt: new Date(),
    },
  });
  paymentId = payment.id;
  await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID', paymentId } });

  const input = {
    stripePaymentIntentId: payment.stripePaymentIntentId!,
    stripeEventId: `evt_${suffix}`,
    providerObjectId: `ch_${suffix}`,
    type: 'REFUND' as const,
  };
  const reversal = await reversePaymentEntitlements(input);

  assert.deepEqual(reversal, {
    paymentId,
    paymentType: 'RETAILER_UNLOCK',
    affectedUserIds: [retailerId],
  });
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'REVERSED');
  assert.equal(await prisma.unlock.count({ where: { paymentId } }), 0);
  assert.equal(await prisma.paymentReversal.count({ where: { paymentId, stripeEventId: input.stripeEventId } }), 1);

  assert.equal(await reversePaymentEntitlements(input), null);
  assert.equal(await prisma.paymentReversal.count({ where: { paymentId } }), 1);
});

test('the Stripe webhook rejects a forged signature before processing payment state', async () => {
  const previousSecretKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = 'sk_test_payment_regression_only';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_payment_regression_only';

  try {
    const response = await POST(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=0,v1=forged' },
      body: JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' }),
    }));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid signature' });
  } finally {
    if (previousSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecretKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('a signed completion event grants one unlock and replays without duplicate access', async (context) => {
  const suffix = randomUUID();
  const previousSecretKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let companyId: string | undefined;
  let tenderId: string | undefined;
  let paymentId: string | undefined;
  const webhookSecret = `whsec_${suffix}`;

  context.after(async () => {
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderItem.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (companyId) await prisma.clientCompany.deleteMany({ where: { id: companyId } });
    if (retailerId) await prisma.retailerProfile.deleteMany({ where: { userId: retailerId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (previousSecretKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecretKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  });

  process.env.STRIPE_SECRET_KEY = 'sk_test_payment_regression_only';
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  const [client, retailer] = await Promise.all([
    prisma.user.create({ data: { email: `signed-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Signed Event Client' } }),
    prisma.user.create({ data: { email: `signed-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Signed Event Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;
  const company = await prisma.clientCompany.create({
    data: {
      companyName: `Signed Event Supplies ${suffix}`,
      branchIdentifier: suffix,
      primaryUserId: retailerId,
      services: 'Construction Materials',
      operatingLocations: 'United Kingdom',
      members: { create: { userId: retailerId } },
    },
  });
  companyId = company.id;
  await prisma.retailerProfile.create({
    data: { userId: retailerId, companyName: company.companyName, coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 0 },
  });
  const tender = await prisma.tender.create({
    data: {
      reference: `SIGNED-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional signed webhook test tender',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes', description: 'Fictional item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId } });
  const payment = await prisma.payment.create({
    data: { type: 'RETAILER_UNLOCK', amountGbp: 10, vatPercentage: 20, vatGbp: 2, totalAmountGbp: 12, status: 'PENDING', userId: retailerId, tenderId },
  });
  paymentId = payment.id;

  const payload = JSON.stringify({
    id: `evt_${suffix}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { object: 'checkout.session', metadata: { paymentId }, amount_total: 1200, payment_intent: null } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const request = () => new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload });

  assert.equal((await POST(request())).status, 200);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'CONFIRMED');
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 1);
  assert.equal((await POST(request())).status, 200);
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 1);
});