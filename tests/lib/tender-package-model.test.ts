import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { createTender, listMatchedSummariesForRetailer } from '../../src/server/domain/tenderService';
import { getUnlockedTenderForRetailer } from '../../src/server/domain/unlockService';

test('a tender job can own a tender package record', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let tenderId: string | undefined;
  let packageId: string | undefined;

  context.after(async () => {
    if (packageId) await prisma.tenderPackage.deleteMany({ where: { id: packageId } });
    if (tenderId) await prisma.tender.deleteMany({ where: { id: tenderId } });
    if (clientId) {
      await prisma.moderationEvent.deleteMany({ where: { actorId: clientId } });
      await prisma.user.deleteMany({ where: { id: clientId } });
    }
  });

  const client = await prisma.user.create({
    data: {
      email: `package-client-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'CONTRACTOR',
      contactName: 'Package Client',
    },
  });
  clientId = client.id;

  const tender = await prisma.tender.create({
    data: {
      reference: `JOB-${suffix}`,
      clientId,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional package-based tender job',
    },
  });
  tenderId = tender.id;

  const pkg = await prisma.tenderPackage.create({
    data: {
      tenderId: tender.id,
      reference: `JOB-${suffix}-PK1`,
      category: 'Construction Materials',
      subcategory: 'Aggregate',
      service: 'Materials',
      item: 'MOT Type 1',
      location: 'Leeds',
      quantity: '20 tonnes',
      urgency: 'Standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Fictional phase 3 package',
    },
  });
  packageId = pkg.id;

  assert.equal(pkg.tenderId, tender.id);
  assert.equal(await prisma.tenderPackage.count({ where: { tenderId: tender.id } }), 1);
  assert.equal((await prisma.tender.findUniqueOrThrow({ where: { id: tender.id }, include: { packages: true } })).packages.length, 1);
});

test('createTender creates a package record for the job and extra package items', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) {
      await prisma.tenderItemMatch.deleteMany({ where: { tenderItem: { tenderId } } });
      await prisma.tenderItem.deleteMany({ where: { tenderId } });
      await prisma.tenderMatch.deleteMany({ where: { tenderId } });
      await prisma.tenderPackage.deleteMany({ where: { tenderId } });
      await prisma.tenderAttachment.deleteMany({ where: { tenderId } });
      await prisma.tender.deleteMany({ where: { id: tenderId } });
    }
    if (clientId) {
      await prisma.moderationEvent.deleteMany({ where: { actorId: clientId } });
      await prisma.user.deleteMany({ where: { id: clientId } });
    }
  });

  const client = await prisma.user.create({
    data: {
      email: `package-create-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'CONTRACTOR',
      contactName: 'Package Creator',
    },
  });
  clientId = client.id;

  const tender = await createTender(client.id, {
    projectName: 'New package test job',
    category: 'Materials',
    subcategory: 'Aggregates',
    item: 'MOT Type 1',
    location: 'Leeds LS10 2AB',
    quantity: '20 tonnes',
    urgency: 'standard',
    closingDate: new Date(Date.now() + 86_400_000),
    description: 'Package validation job',
    requirements: [],
    items: [{
      category: 'Plant Hire',
      subcategory: 'Excavators',
      item: 'Mini excavators approx. 1.5-3 tonnes',
      quantity: '1 unit',
      description: 'Excavator package',
    }],
    attachments: [],
  });
  tenderId = tender.id;

  const packages = await prisma.tenderPackage.findMany({ where: { tenderId: tender.id }, orderBy: { createdAt: 'asc' } });

  assert.equal(packages.length, 2);
  assert.deepEqual(packages.map((pkg) => pkg.category), ['Materials', 'Plant Hire']);
  assert.ok(packages.every((pkg) => pkg.reference.startsWith(tender.reference)));
});

test('listMatchedSummariesForRetailer exposes package metadata for multi-package jobs', async (context) => {
  const suffix = randomUUID();
  let clientId: string | undefined;
  let retailerId: string | undefined;
  let tenderId: string | undefined;

  context.after(async () => {
    if (tenderId) {
      await prisma.unlock.deleteMany({ where: { tenderId } });
      await prisma.tenderMatch.deleteMany({ where: { tenderId } });
      await prisma.tenderPackage.deleteMany({ where: { tenderId } });
      await prisma.tenderItem.deleteMany({ where: { tenderId } });
      await prisma.tender.deleteMany({ where: { id: tenderId } });
    }
    if (retailerId) {
      await prisma.retailerProfile.deleteMany({ where: { userId: retailerId } });
    }
    if (clientId) {
      await prisma.moderationEvent.deleteMany({ where: { actorId: clientId } });
      await prisma.user.deleteMany({ where: { id: clientId } });
    }
    if (retailerId) {
      await prisma.user.deleteMany({ where: { id: retailerId } });
    }
  });

  const client = await prisma.user.create({
    data: {
      email: `package-summary-client-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'CONTRACTOR',
      contactName: 'Client Summary',
    },
  });
  clientId = client.id;

  const retailer = await prisma.user.create({
    data: {
      email: `package-summary-retailer-${suffix}@example.test`,
      passwordHash: 'not-used',
      role: 'PROVIDER',
      contactName: 'Retailer Summary',
    },
  });
  retailerId = retailer.id;

  await prisma.retailerProfile.create({
    data: {
      userId: retailer.id,
      companyName: 'Package Summary Retailer',
      coverageScope: 'REGION',
      regions: 'Yorkshire and The Humber',
      categories: 'Materials, Plant Hire',
      coverageAreas: 'LS, BD, HX',
    },
  });

  const tender = await prisma.tender.create({
    data: {
      reference: `JOB-${suffix}`,
      clientId: client.id,
      category: 'Materials',
      subcategory: 'Aggregates',
      service: 'Materials',
      item: 'MOT Type 1',
      location: 'Leeds LS10 2AB',
      quantity: '20 tonnes',
      urgency: 'standard',
      closingDate: new Date(Date.now() + 86_400_000),
      requirements: 'Delivery',
      description: 'Test package summary tender',
      status: 'OPEN',
      items: {
        create: [{
          category: 'Materials',
          subcategory: 'Aggregates',
          item: 'MOT Type 1',
          quantity: '20 tonnes',
          description: 'Main package item',
        }],
      },
    },
  });
  tenderId = tender.id;

  await prisma.tenderPackage.createMany({
    data: [
      {
        tenderId: tender.id,
        reference: `${tender.reference}-PK1`,
        category: 'Materials',
        subcategory: 'Aggregates',
        service: 'Materials',
        item: 'MOT Type 1',
        location: 'Leeds LS10 2AB',
        quantity: '20 tonnes',
        urgency: 'standard',
        closingDate: tender.closingDate,
        requirements: 'Delivery',
        description: 'Main materials package',
        status: 'OPEN',
      },
      {
        tenderId: tender.id,
        reference: `${tender.reference}-PK2`,
        category: 'Plant Hire',
        subcategory: 'Excavators',
        service: 'Plant Hire',
        item: 'Mini excavators approx. 1.5-3 tonnes',
        location: 'Leeds LS10 2AB',
        quantity: '1 unit',
        urgency: 'standard',
        closingDate: tender.closingDate,
        requirements: 'Delivery',
        description: 'Plant hire package',
        status: 'OPEN',
      },
    ],
  });

  await prisma.tenderMatch.create({
    data: {
      tenderId: tender.id,
      retailerId: retailer.id,
    },
  });

  const summaries = await listMatchedSummariesForRetailer(retailer.id);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].tender.packageCount, 2);
  assert.deepEqual(summaries[0].tender.packageCategories, ['Materials', 'Plant Hire']);

  await prisma.unlock.create({ data: { tenderId: tender.id, retailerId: retailer.id, method: 'CREDIT' } });
  const unlockedTender = await getUnlockedTenderForRetailer(retailer.id, tender.id);
  assert.deepEqual(unlockedTender.packages.map((pkg) => pkg.category), ['Materials', 'Plant Hire']);
});
