import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { POST as retentionPost } from '../../src/app/api/internal/retention/route';
import { ForbiddenError } from '../../src/server/auth/session';
import { prisma } from '../../src/server/data/prisma';
import { requestUnlock } from '../../src/server/domain/unlockService';
import { listQuotesForClientTender } from '../../src/server/domain/quoteService';

test('a User cannot unlock their own tender', async (context) => {
  const suffix = randomUUID();
  let userId: string | undefined;
  let companyId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderItem.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (companyId) await prisma.clientCompany.deleteMany({ where: { id: companyId } });
    if (userId) {
      await prisma.retailerProfile.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  const user = await prisma.user.create({ data: { email: `own-tender-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Own Tender User' } });
  userId = user.id;
  const company = await prisma.clientCompany.create({
    data: { companyName: `Own Tender Co ${suffix}`, branchIdentifier: suffix, primaryUserId: userId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId } } },
  });
  companyId = company.id;
  await prisma.retailerProfile.create({
    data: { userId, companyName: company.companyName, coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 5 },
  });
  const tender = await prisma.tender.create({
    data: {
      reference: `OWN-${suffix}`,
      clientId: userId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '1',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Own-tender IDOR fixture',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT', quantity: '1', description: 'Item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId: userId } });

  await assert.rejects(() => requestUnlock(userId!, tenderId!), (error: unknown) => error instanceof ForbiddenError);
});

test('a User cannot list quotes for another User\'s tender', async (context) => {
  const suffix = randomUUID();
  let ownerId: string | undefined;
  let strangerId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    const ids = [ownerId, strangerId].filter((id): id is string => Boolean(id));
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  const [owner, stranger] = await Promise.all([
    prisma.user.create({ data: { email: `idor-owner-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Owner' } }),
    prisma.user.create({ data: { email: `idor-stranger-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Stranger' } }),
  ]);
  ownerId = owner.id;
  strangerId = stranger.id;
  const tender = await prisma.tender.create({
    data: { reference: `IDOR-${suffix}`, clientId: ownerId, category: 'Construction Materials', subcategory: 'Aggregate', location: 'Leeds', quantity: '1', urgency: 'Standard', closingDate: new Date(Date.now() + 86_400_000), requirements: 'Delivery', description: 'Quote IDOR fixture' },
  });
  tenderId = tender.id;

  await assert.rejects(() => listQuotesForClientTender(strangerId!, tenderId!), (error: unknown) => error instanceof ForbiddenError);
});

test('the retention job rejects missing or wrong bearer secrets', async () => {
  const previous = process.env.RETENTION_JOB_SECRET;
  process.env.RETENTION_JOB_SECRET = 'retention-test-secret';
  try {
    const missing = await retentionPost(new Request('http://localhost/api/internal/retention', { method: 'POST' }));
    assert.equal(missing.status, 401);
    const wrong = await retentionPost(new Request('http://localhost/api/internal/retention', { method: 'POST', headers: { authorization: 'Bearer other-secret' } }));
    assert.equal(wrong.status, 401);
  } finally {
    if (previous === undefined) delete process.env.RETENTION_JOB_SECRET;
    else process.env.RETENTION_JOB_SECRET = previous;
  }
});
