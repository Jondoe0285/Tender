import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { ForbiddenError } from '../../src/server/auth/session';
import { prisma } from '../../src/server/data/prisma';
import { finalizeContactRelease } from '../../src/server/domain/contactReleaseService';
import { listTenderMessages, sendTenderMessage } from '../../src/server/domain/messageService';

test('retailer messaging requires contact release even after tender unlock', async (context) => {
  const suffix = randomUUID();
  const clientEmail = `integration-client-${suffix}@example.test`;
  const retailerEmail = `integration-retailer-${suffix}@example.test`;
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let quoteId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.tenderMessage.deleteMany({ where: { tenderId } });
    if (quoteId) await prisma.contactRelease.deleteMany({ where: { quoteId } });
    if (quoteId) await prisma.payment.deleteMany({ where: { quoteId } });
    if (tenderId) await prisma.quote.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (clientId || retailerId) {
      await prisma.moderationEvent.deleteMany({ where: { actorId: { in: [clientId, retailerId].filter((id): id is string => Boolean(id)) } } });
    }
    if (clientId || retailerId) await prisma.user.deleteMany({ where: { id: { in: [clientId, retailerId].filter((id): id is string => Boolean(id)) } } });
  });

  const [client, retailer] = await Promise.all([
    prisma.user.create({
      data: { email: clientEmail, passwordHash: 'not-used', role: 'CLIENT', contactName: 'Integration Client' },
    }),
    prisma.user.create({
      data: { email: retailerEmail, passwordHash: 'not-used', role: 'RETAILER', contactName: 'Integration Retailer' },
    }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;

  const tender = await prisma.tender.create({
    data: {
      reference: `INT-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional integration-test tender',
    },
  });
  tenderId = tender.id;

  const quote = await prisma.quote.create({
    data: {
      reference: `INT-${suffix}-Q01`,
      tenderId,
      retailerId,
      priceGbp: 1000,
      leadTimeDays: 2,
      deliveryInfo: 'Fictional test delivery',
      validityDays: 14,
      status: 'ACCEPTED',
    },
  });
  quoteId = quote.id;

  await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID' } });

  const retailerActor = { id: retailerId, role: 'RETAILER' as const };
  await assert.rejects(
    () => listTenderMessages(tenderId, retailerActor),
    (error: unknown) => error instanceof ForbiddenError && error.message === 'Contact details must be released before messaging'
  );
  await assert.rejects(
    () => sendTenderMessage(tenderId, retailerActor, 'Can you confirm the delivery date?'),
    (error: unknown) => error instanceof ForbiddenError && error.message === 'Contact details must be released before messaging'
  );

  const payment = await prisma.payment.create({
    data: {
      type: 'CLIENT_RELEASE',
      amountGbp: 10,
      totalAmountGbp: 10,
      status: 'CONFIRMED',
      userId: clientId,
      quoteId,
      confirmedAt: new Date(),
    },
  });
  await prisma.contactRelease.create({
    data: { tenderId, quoteId, clientId, retailerId, authorizingPaymentId: payment.id },
  });

  assert.deepEqual(await listTenderMessages(tenderId, retailerActor), []);
  const message = await sendTenderMessage(tenderId, retailerActor, 'Can you confirm the delivery date?');
  assert.equal(message.body, 'Can you confirm the delivery date?');

  const messages = await listTenderMessages(tenderId, retailerActor);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.body, 'Can you confirm the delivery date?');
  assert.equal(messages[0]?.senderRole, 'RETAILER');
});

test('contact release writes a minimal immutable audit event', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let quoteId: string | undefined;

  context.after(async () => {
    if (quoteId) {
      await prisma.auditLog.deleteMany({ where: { targetId: quoteId } });
      await prisma.$executeRawUnsafe('ALTER TABLE "ContactReleaseAuditEvent" DISABLE TRIGGER contact_release_audit_event_immutable');
      await prisma.contactReleaseAuditEvent.deleteMany({ where: { quoteId } });
      await prisma.$executeRawUnsafe('ALTER TABLE "ContactReleaseAuditEvent" ENABLE TRIGGER contact_release_audit_event_immutable');
      await prisma.contactRelease.deleteMany({ where: { quoteId } });
      await prisma.payment.deleteMany({ where: { quoteId } });
    }
    if (tenderId) await prisma.quote.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const [client, retailer] = await Promise.all([
    prisma.user.create({ data: { email: `release-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'CLIENT', contactName: 'Release Client', contactPhone: '07123456789' } }),
    prisma.user.create({ data: { email: `release-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'RETAILER', contactName: 'Release Retailer', contactPhone: '07987654321' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;
  const tender = await prisma.tender.create({
    data: { reference: `RELEASE-${suffix}`, clientId, category: 'Construction Materials', subcategory: 'Aggregate', location: 'Leeds', quantity: '20 tonnes', urgency: 'Standard', closingDate: new Date(Date.now() + 86_400_000), requirements: 'Delivery', description: 'Fictional contact release audit test tender' },
  });
  tenderId = tender.id;
  const quote = await prisma.quote.create({
    data: { reference: `RELEASE-${suffix}-Q01`, tenderId, retailerId, priceGbp: 1000, leadTimeDays: 2, deliveryInfo: 'Fictional delivery', validityDays: 14, status: 'ACCEPTED' },
  });
  quoteId = quote.id;
  const payment = await prisma.payment.create({
    data: { type: 'CLIENT_RELEASE', amountGbp: 10, totalAmountGbp: 10, status: 'CONFIRMED', userId: clientId, quoteId, confirmedAt: new Date() },
  });

  const release = await finalizeContactRelease(clientId, quoteId, payment.id);
  const auditEvent = await prisma.contactReleaseAuditEvent.findUniqueOrThrow({ where: { quoteId } });
  const genericAudit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: quoteId, action: 'CONTACT_RELEASED' } });
  const metadata = JSON.parse(genericAudit.metadata ?? '{}') as Record<string, unknown>;

  assert.equal(auditEvent.contactReleaseId, release.id);
  assert.equal(auditEvent.actorId, clientId);
  assert.equal(auditEvent.tenderId, tenderId);
  assert.equal(auditEvent.clientId, clientId);
  assert.equal(auditEvent.retailerId, retailerId);
  assert.equal(auditEvent.releasedDataCategory, 'CONTACT_DETAILS');
  assert.equal(auditEvent.authorizingPaymentId, payment.id);
  assert.match(auditEvent.correlationId, /^[0-9a-f-]{36}$/i);
  assert.equal(auditEvent.releasedAt.getTime(), release.releasedAt.getTime());
  assert.deepEqual(Object.keys(metadata).sort(), ['authorizingPaymentId', 'clientId', 'correlationId', 'releasedAt', 'releasedDataCategory', 'retailerId', 'tenderId']);
  assert.equal(JSON.stringify(metadata).includes(client.email), false);
  assert.equal(JSON.stringify(metadata).includes(retailer.email), false);
  assert.equal(JSON.stringify(metadata).includes('07123456789'), false);
  assert.equal(JSON.stringify(metadata).includes('07987654321'), false);
  await assert.rejects(() => prisma.contactReleaseAuditEvent.update({ where: { id: auditEvent.id }, data: { releasedDataCategory: 'ALTERED' } }));
  await assert.rejects(() => prisma.contactReleaseAuditEvent.delete({ where: { id: auditEvent.id } }));
});