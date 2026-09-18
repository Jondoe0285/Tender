import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { ForbiddenError } from '../../src/server/auth/session';
import { prisma } from '../../src/server/data/prisma';
import { assertTenderOpenForActivity } from '../../src/server/domain/tenderService';

async function createTenderForActivityTest(status: 'OPEN' | 'CLOSED', closingDate: Date) {
  const suffix = randomUUID();
  const user = await prisma.user.create({ data: { email: `activity-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Activity Test User' } });
  const tender = await prisma.tender.create({
    data: {
      reference: `ACT-${suffix}`,
      clientId: user.id,
      category: 'Materials',
      subcategory: 'Aggregates',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'standard',
      closingDate,
      requirements: '',
      description: 'Tender activity guard integration test',
      status,
    },
  });
  return { tenderId: tender.id, userId: user.id };
}

async function removeTenderActivityTest(tenderId: string, userId: string) {
  await prisma.tender.delete({ where: { id: tenderId } });
  await prisma.user.delete({ where: { id: userId } });
}

test('rejects new activity for an expired tender', async (context) => {
  const fixture = await createTenderForActivityTest('OPEN', new Date(Date.now() - 1_000));
  context.after(() => removeTenderActivityTest(fixture.tenderId, fixture.userId));
  await assert.rejects(() => assertTenderOpenForActivity(fixture.tenderId), ForbiddenError);
});

test('rejects new activity for a closed tender', async (context) => {
  const fixture = await createTenderForActivityTest('CLOSED', new Date(Date.now() + 86_400_000));
  context.after(() => removeTenderActivityTest(fixture.tenderId, fixture.userId));
  await assert.rejects(() => assertTenderOpenForActivity(fixture.tenderId), ForbiddenError);
});