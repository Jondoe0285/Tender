import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import Stripe from 'stripe';
import { POST } from '../../src/app/api/webhooks/stripe/route';
import { prisma } from '../../src/server/data/prisma';
import { reversePaymentEntitlements } from '../../src/server/payments/paymentReversalService';

test('a chargeback (DISPUTE) event revokes the paid unlock, matching REFUND handling', async (context) => {
  const suffix = randomUUID();
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let paymentId: string | undefined;

  context.after(async () => {
    if (paymentId) await prisma.paymentReversal.deleteMany({ where: { paymentId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (retailerId) await prisma.user.deleteMany({ where: { id: retailerId } });
  });

  const retailer = await prisma.user.create({ data: { email: `dispute-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Dispute Retailer' } });
  retailerId = retailer.id;
  const tender = await prisma.tender.create({
    data: { reference: `DISPUTE-${suffix}`, clientId: retailerId, category: 'Construction Materials', subcategory: 'Aggregate', location: 'Leeds', quantity: '20 tonnes', urgency: 'Standard', closingDate: new Date(Date.now() + 86_400_000), requirements: 'Delivery', description: 'Fictional dispute test tender' },
  });
  tenderId = tender.id;
  const payment = await prisma.payment.create({
    data: { type: 'RETAILER_UNLOCK', amountGbp: 10, vatPercentage: 20, vatGbp: 2, totalAmountGbp: 12, status: 'CONFIRMED', userId: retailerId, tenderId, stripePaymentIntentId: `pi_${suffix}`, confirmedAt: new Date() },
  });
  paymentId = payment.id;
  await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID', paymentId } });

  const input = { stripePaymentIntentId: payment.stripePaymentIntentId!, stripeEventId: `evt_${suffix}`, providerObjectId: `dp_${suffix}`, type: 'DISPUTE' as const };
  const reversal = await reversePaymentEntitlements(input);

  assert.deepEqual(reversal, { paymentId, paymentType: 'RETAILER_UNLOCK', affectedUserIds: [retailerId] });
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'REVERSED');
  assert.equal(await prisma.unlock.count({ where: { paymentId } }), 0);
  const storedReversal = await prisma.paymentReversal.findUniqueOrThrow({ where: { stripeEventId: input.stripeEventId } });
  assert.equal(storedReversal.type, 'DISPUTE');

  // A duplicate delivery of the same dispute event must not create a second reversal record.
  assert.equal(await reversePaymentEntitlements(input), null);
  assert.equal(await prisma.paymentReversal.count({ where: { paymentId } }), 1);
});

test('a reversal delivered before the completion event blocks the later out-of-order finalisation', async (context) => {
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
    if (paymentId) await prisma.paymentReversal.deleteMany({ where: { paymentId } });
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
    prisma.user.create({ data: { email: `ooo-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Out Of Order Client' } }),
    prisma.user.create({ data: { email: `ooo-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Out Of Order Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;
  const company = await prisma.clientCompany.create({
    data: { companyName: `Out Of Order Supplies ${suffix}`, branchIdentifier: suffix, primaryUserId: retailerId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId: retailerId } } },
  });
  companyId = company.id;
  await prisma.retailerProfile.create({
    data: { userId: retailerId, companyName: company.companyName, coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 0 },
  });
  const tender = await prisma.tender.create({
    data: {
      reference: `OOO-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional out-of-order webhook test tender',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes', description: 'Fictional item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId } });
  const payment = await prisma.payment.create({
    data: { type: 'RETAILER_UNLOCK', amountGbp: 10, vatPercentage: 20, vatGbp: 2, totalAmountGbp: 12, status: 'PENDING', userId: retailerId, tenderId, stripePaymentIntentId: `pi_${suffix}` },
  });
  paymentId = payment.id;

  // A refund/dispute delivered ahead of the completion event (e.g. a delayed webhook retry) reverses the payment first.
  const refundPayload = JSON.stringify({
    id: `evt_refund_${suffix}`,
    object: 'event',
    type: 'charge.refunded',
    data: { object: { object: 'charge', id: `ch_${suffix}`, refunded: true, payment_intent: payment.stripePaymentIntentId } },
  });
  const refundSignature = Stripe.webhooks.generateTestHeaderString({ payload: refundPayload, secret: webhookSecret });
  const refundResponse = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': refundSignature }, body: refundPayload }));
  assert.equal(refundResponse.status, 200);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'REVERSED');

  // The completion event now arrives out of order — it must not resurrect the payment or grant an unlock.
  const completionPayload = JSON.stringify({
    id: `evt_complete_${suffix}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { object: 'checkout.session', metadata: { paymentId }, amount_total: 1200, payment_intent: null } },
  });
  const completionSignature = Stripe.webhooks.generateTestHeaderString({ payload: completionPayload, secret: webhookSecret });
  const completionResponse = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': completionSignature }, body: completionPayload }));
  assert.equal(completionResponse.status, 200);

  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status, 'REVERSED');
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 0);
});

test('a retry after a partial failure resumes entitlement finalisation instead of stopping silently', async (context) => {
  const suffix = randomUUID();
  const previousSecretKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let companyId: string | undefined;
  let tenderId: string | undefined;
  let paymentId: string | undefined;
  const webhookSecret = `whsec_${suffix}`;
  const eventId = `evt_partial_${suffix}`;

  context.after(async () => {
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (paymentId) {
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_immutable');
      await prisma.auditLog.deleteMany({ where: { targetId: paymentId, targetType: 'Payment' } });
      await prisma.$executeRawUnsafe('ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_immutable');
    }
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
    prisma.user.create({ data: { email: `partial-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Partial Failure Client' } }),
    prisma.user.create({ data: { email: `partial-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Partial Failure Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;
  const company = await prisma.clientCompany.create({
    data: { companyName: `Partial Failure Supplies ${suffix}`, branchIdentifier: suffix, primaryUserId: retailerId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId: retailerId } } },
  });
  companyId = company.id;
  await prisma.retailerProfile.create({
    data: { userId: retailerId, companyName: company.companyName, coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 0 },
  });
  const tender = await prisma.tender.create({
    data: {
      reference: `PARTIAL-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional partial-failure webhook test tender',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes', description: 'Fictional item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId } });

  // Simulates a prior delivery of this event that updated the payment to CONFIRMED but then
  // threw before the unlock was created and before the PAYMENT_CONFIRMED audit event was recorded.
  const payment = await prisma.payment.create({
    data: { type: 'RETAILER_UNLOCK', amountGbp: 10, vatPercentage: 20, vatGbp: 2, totalAmountGbp: 12, status: 'CONFIRMED', confirmedAt: new Date(), stripeEventId: eventId, userId: retailerId, tenderId },
  });
  paymentId = payment.id;
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 0);

  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { object: 'checkout.session', metadata: { paymentId }, amount_total: 1200, payment_intent: null } },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const request = () => new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload });

  assert.equal((await POST(request())).status, 200);
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 1);
  const auditEvents = await prisma.auditLog.findMany({ where: { targetId: paymentId, targetType: 'Payment', action: 'PAYMENT_CONFIRMED' } });
  assert.equal(auditEvents.length, 1);

  // A subsequent duplicate delivery of the same event must not create a second unlock or audit event.
  assert.equal((await POST(request())).status, 200);
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId, paymentId } }), 1);
  assert.equal((await prisma.auditLog.count({ where: { targetId: paymentId, targetType: 'Payment', action: 'PAYMENT_CONFIRMED' } })), 1);
});

