import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { ForbiddenError } from '../../src/server/auth/session';
import { ensureDefaultMembershipTiers, requestMembershipTierPurchase } from '../../src/server/domain/membershipService';

test('the approved default membership tier catalog is seeded inactive with the baseline pricing', async () => {
  const expected = [
    ['Free', 0],
    ['Starter', 29],
    ['Growth', 49],
    ['Pro', 99],
    ['Enterprise', 199],
  ] as const;

  await ensureDefaultMembershipTiers();

  const tiers = await prisma.membershipTier.findMany({
    where: { name: { in: expected.map(([name]) => name) } },
    orderBy: { monthlyPriceGbp: 'asc' },
  });

  assert.deepEqual(
    tiers.map((tier) => [tier.name, tier.monthlyPriceGbp] as const),
    expected,
  );
  assert.ok(tiers.every((tier) => tier.active === false));
});

test('membership purchases use the active server-side tier price and remain disabled by default', async (context) => {
  const suffix = randomUUID();
  let retailerId: string | undefined;
  let tierId: string | undefined;
  const originalMembershipTiersSetting = await prisma.platformSetting.findUnique({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });

  context.after(async () => {
    if (retailerId) await prisma.payment.deleteMany({ where: { userId: retailerId } });
    if (tierId) await prisma.membershipTier.deleteMany({ where: { id: tierId } });
    if (retailerId) await prisma.user.deleteMany({ where: { id: retailerId } });
    if (originalMembershipTiersSetting) {
      await prisma.platformSetting.update({ where: { id: originalMembershipTiersSetting.id }, data: { value: originalMembershipTiersSetting.value } });
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });
    }
  });

  const retailer = await prisma.user.create({ data: { email: `membership-billing-${suffix}@example.test`, passwordHash: 'not-used', role: 'PROVIDER', contactName: 'Membership Billing Retailer' } });
  retailerId = retailer.id;
  const tier = await prisma.membershipTier.create({
    data: { name: `Membership billing ${suffix}`, description: 'Fictional test tier', monthlyPriceGbp: 49, freeTenderOpportunitiesPerMonth: 10, active: true },
  });
  tierId = tier.id;

  await prisma.platformSetting.upsert({
    where: { key: 'MEMBERSHIP_TIERS_ACTIVE' },
    update: { value: 'false' },
    create: { key: 'MEMBERSHIP_TIERS_ACTIVE', value: 'false' },
  });
  await assert.rejects(() => requestMembershipTierPurchase(retailerId!, tierId!), ForbiddenError);
  assert.equal(await prisma.payment.count({ where: { userId: retailerId, tierId } }), 0);

  await prisma.platformSetting.update({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' }, data: { value: 'true' } });
  const outcome = await requestMembershipTierPurchase(retailerId, tierId);
  assert.equal(outcome.status, 'PAYMENT_REQUIRED');
  assert.equal(outcome.amountGbp, 49);
  assert.equal(outcome.vatGbp, 9.8);
  assert.equal(outcome.totalAmountGbp, 58.8);

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: outcome.paymentId } });
  assert.equal(payment.amountGbp, 49);
  assert.equal(payment.vatGbp, 9.8);
  assert.equal(payment.totalAmountGbp, 58.8);
});