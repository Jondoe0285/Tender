import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { requestUnlock } from '../../src/server/domain/unlockService';

test('a zero-cost unlock fee waives payment and opens the tender immediately', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let retailerCompanyId: string | undefined;
  let tenderId: string | undefined;
  const originalMembershipTiersSetting = await prisma.platformSetting.findUnique({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });
  const originalUnlockFeeSetting = await prisma.platformSetting.findUnique({ where: { key: 'RETAILER_UNLOCK_FEE_GBP' } });

  context.after(async () => {
    if (tenderId) await prisma.payment.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderItem.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (retailerId) await prisma.retailerProfile.deleteMany({ where: { userId: retailerId } });
    if (retailerCompanyId) await prisma.clientCompany.deleteMany({ where: { id: retailerCompanyId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (originalMembershipTiersSetting) {
      await prisma.platformSetting.update({ where: { id: originalMembershipTiersSetting.id }, data: { value: originalMembershipTiersSetting.value } });
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });
    }
    if (originalUnlockFeeSetting) {
      await prisma.platformSetting.update({ where: { id: originalUnlockFeeSetting.id }, data: { value: originalUnlockFeeSetting.value } });
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: 'RETAILER_UNLOCK_FEE_GBP' } });
    }
  });

  await prisma.platformSetting.upsert({
    where: { key: 'MEMBERSHIP_TIERS_ACTIVE' },
    update: { value: 'false' },
    create: { key: 'MEMBERSHIP_TIERS_ACTIVE', value: 'false' },
  });
  await prisma.platformSetting.upsert({
    where: { key: 'RETAILER_UNLOCK_FEE_GBP' },
    update: { value: '0' },
    create: { key: 'RETAILER_UNLOCK_FEE_GBP', value: '0' },
  });

  const [client, retailer] = await Promise.all([
    prisma.user.create({ data: { email: `zero-fee-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Zero Fee Client' } }),
    prisma.user.create({ data: { email: `zero-fee-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Zero Fee Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;

  const retailerCompany = await prisma.clientCompany.create({
    data: { companyName: `Zero Fee Test Supplies ${suffix}`, branchIdentifier: suffix, primaryUserId: retailerId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId: retailerId } } },
  });
  retailerCompanyId = retailerCompany.id;

  await prisma.retailerProfile.create({
    data: { userId: retailerId, companyName: 'Zero Fee Test Supplies', coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 0 },
  });

  const tender = await prisma.tender.create({
    data: {
      reference: `FREE-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Free unlock tender test',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes', description: 'Fictional item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId } });

  const outcome = await requestUnlock(retailerId, tenderId);

  assert.equal(outcome.status, 'UNLOCKED_WITHOUT_PAYMENT_REQUIRED');
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId } }), 1);
  assert.equal(await prisma.payment.count({ where: { tenderId, userId: retailerId, type: 'RETAILER_UNLOCK' } }), 0);
});

test('an active membership allowance cannot unlock a tender while membership tiers are disabled', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let retailerCompanyId: string | undefined;
  let tenderId: string | undefined;
  let tierId: string | undefined;
  const originalMembershipTiersSetting = await prisma.platformSetting.findUnique({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });

  context.after(async () => {
    if (tenderId) await prisma.payment.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.unlock.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderMatch.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tenderItem.deleteMany({ where: { tenderId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (retailerId) await prisma.retailerMembership.deleteMany({ where: { retailerId } });
    if (retailerId) await prisma.retailerProfile.deleteMany({ where: { userId: retailerId } });
    if (retailerCompanyId) await prisma.clientCompany.deleteMany({ where: { id: retailerCompanyId } });
    const userIds = [clientId, retailerId].filter((id): id is string => Boolean(id));
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (tierId) await prisma.membershipTier.deleteMany({ where: { id: tierId } });
    if (originalMembershipTiersSetting) {
      await prisma.platformSetting.update({ where: { id: originalMembershipTiersSetting.id }, data: { value: originalMembershipTiersSetting.value } });
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: 'MEMBERSHIP_TIERS_ACTIVE' } });
    }
  });

  await prisma.platformSetting.upsert({
    where: { key: 'MEMBERSHIP_TIERS_ACTIVE' },
    update: { value: 'false' },
    create: { key: 'MEMBERSHIP_TIERS_ACTIVE', value: 'false' },
  });
  await prisma.platformSetting.upsert({
    where: { key: 'RETAILER_UNLOCK_FEE_GBP' },
    update: { value: '10' },
    create: { key: 'RETAILER_UNLOCK_FEE_GBP', value: '10' },
  });

  const [client, retailer] = await Promise.all([
    prisma.user.create({ data: { email: `membership-client-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Membership Client' } }),
    prisma.user.create({ data: { email: `membership-retailer-${suffix}@example.test`, passwordHash: 'not-used', role: 'USER', contactName: 'Membership Retailer' } }),
  ]);
  clientId = client.id;
  retailerId = retailer.id;

  const retailerCompany = await prisma.clientCompany.create({
    data: { companyName: `Membership Test Supplies ${suffix}`, branchIdentifier: suffix, primaryUserId: retailerId, services: 'Construction Materials', operatingLocations: 'United Kingdom', members: { create: { userId: retailerId } } },
  });
  retailerCompanyId = retailerCompany.id;

  await prisma.retailerProfile.create({
    data: { userId: retailerId, companyName: 'Membership Test Supplies', coverageScope: 'UK', counties: '', regions: '', categories: 'Construction Materials', coverageAreas: '', launchCreditsLeft: 0 },
  });
  const tender = await prisma.tender.create({
    data: {
      reference: `MEM-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional membership gate test tender',
      items: { create: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes', description: 'Fictional item' } },
    },
  });
  tenderId = tender.id;
  await prisma.tenderMatch.create({ data: { tenderId, retailerId } });

  const tier = await prisma.membershipTier.create({
    data: { name: `Membership test ${suffix}`, description: 'Fictional test tier', monthlyPriceGbp: 20, freeTenderOpportunitiesPerMonth: 5, active: true },
  });
  tierId = tier.id;
  await prisma.retailerMembership.create({ data: { retailerId, tierId, active: true } });

  const outcome = await requestUnlock(retailerId, tenderId);

  assert.equal(outcome.status, 'PAYMENT_REQUIRED');
  assert.equal(await prisma.unlock.count({ where: { tenderId, retailerId } }), 0);
  assert.equal(await prisma.payment.count({ where: { tenderId, userId: retailerId, type: 'RETAILER_UNLOCK', status: 'PENDING' } }), 1);
});