import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { getUnlockedTenderForRetailer } from '../../src/server/domain/unlockService';
import { listQuotesForClientTender } from '../../src/server/domain/quoteService';

test('an unlocked tender view never exposes the Contractor identity or contact details', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let companyId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (companyId) await prisma.clientCompany.deleteMany({ where: { id: companyId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const client = await prisma.user.create({
    data: {
      email: `privacy-client-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'USER',
      contactName: 'Privacy Test Contractor',
      contactPhone: '07111222333',
    },
  });
  clientId = client.id;
  const retailer = await prisma.user.create({
    data: { email: `privacy-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Privacy Test Provider' },
  });
  retailerId = retailer.id;
  const company = await prisma.clientCompany.create({
    data: { companyName: `Privacy Test Supplies ${suffix}`, branchIdentifier: suffix, primaryUserId: retailerId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId: retailerId } } },
  });
  companyId = company.id;
  const tender = await prisma.tender.create({
    data: {
      reference: `PRIVACY-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional privacy invariant test tender',
    },
  });
  tenderId = tender.id;
  await prisma.unlock.create({ data: { tenderId, retailerId, method: 'PAID' } });

  const unlockedView = await getUnlockedTenderForRetailer(retailerId, tenderId);
  const serialized = JSON.stringify(unlockedView);

  assert.equal('clientId' in unlockedView, false);
  assert.equal(serialized.includes(clientId), false);
  assert.equal(serialized.includes(client.email), false);
  assert.equal(serialized.includes('07111222333'), false);
  assert.equal(serialized.includes('Privacy Test Contractor'), false);
});

test('the Contractor quote-comparison list never exposes the Provider identity or contact details before release', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let tenderId: string | undefined;
  let quoteId: string | undefined;

  context.after(async () => {
    if (quoteId) await prisma.quote.deleteMany({ where: { id: quoteId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const client = await prisma.user.create({
    data: { email: `privacy-quote-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Privacy Quote Contractor' },
  });
  clientId = client.id;
  const retailer = await prisma.user.create({
    data: { email: `privacy-quote-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Privacy Quote Provider', contactPhone: '07444555666' },
  });
  retailerId = retailer.id;
  const tender = await prisma.tender.create({
    data: {
      reference: `PRIVACY-Q-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional privacy invariant quote test tender',
    },
  });
  tenderId = tender.id;
  const quote = await prisma.quote.create({
    data: { reference: `PRIVACY-Q-${suffix}-Q01`, tenderId, retailerId, priceGbp: 1000, leadTimeDays: 2, deliveryInfo: 'Fictional delivery', validityDays: 14, status: 'SUBMITTED' },
  });
  quoteId = quote.id;

  const quotes = await listQuotesForClientTender(clientId, tenderId);
  const serialized = JSON.stringify(quotes);

  assert.equal('retailerId' in (quotes[0] ?? {}), false);
  assert.equal(serialized.includes(retailerId), false);
  assert.equal(serialized.includes(retailer.email), false);
  assert.equal(serialized.includes('07444555666'), false);
  assert.equal(serialized.includes('Privacy Quote Provider'), false);
});
