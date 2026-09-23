import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCategoryDefinitions, catalogServiceNames, cloneCatalog, isCatalogProvision, publishedCatalogVersion, seedCatalog } from '../../src/lib/catalog';
import { createRegisterSchemaForCatalog, registerSchema } from '../../src/lib/schemas/register';
import { createTenderSchemaForCatalog } from '../../src/lib/schemas/tender';

test('deactivating a family removes it from the published catalog while the seed still contains it', () => {
  const seed = seedCatalog();
  assert.equal(isCatalogProvision(seed, 'Materials', 'Bricks'), true);
  const published = applyCategoryDefinitions(seed, [{
    service: 'Materials',
    name: 'Bricks',
    itemsJson: JSON.stringify(['Facing bricks']),
    active: false,
    updatedAt: new Date('2026-09-22T10:00:00.000Z'),
  }]);
  assert.equal(isCatalogProvision(published, 'Materials', 'Bricks'), false);
  assert.equal(isCatalogProvision(seed, 'Materials', 'Bricks'), true);
});

test('ops item edits overlay the seed family used by register and tender validation', () => {
  const published = applyCategoryDefinitions(seedCatalog(), [{
    service: 'Materials',
    name: 'Bricks',
    itemsJson: JSON.stringify(['Engineering bricks only']),
    active: true,
    updatedAt: new Date('2026-09-22T11:00:00.000Z'),
  }]);
  const register = createRegisterSchemaForCatalog(published);
  assert.equal(register.safeParse({
    email: 'ops-catalog@example.test',
    password: 'StrongPassword!1',
    contactName: 'Catalog Tester',
    role: 'USER',
    termsAccepted: true,
    privacyAccepted: true,
    companyName: 'Catalog Ltd',
    categories: ['Materials'],
    serviceProvisions: ['Materials::Bricks'],
  }).success, true);
  assert.equal(createTenderSchemaForCatalog(published).safeParse({
    projectName: 'Facing brick package',
    category: 'Materials',
    subcategory: 'Bricks',
    item: 'Facing bricks',
    location: 'Leeds LS10 2AB',
    quantity: '2000 units',
    itemDescription: 'Facing bricks to the published specification including delivery assumptions.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Brick supply against the published catalog family after the ops rename.',
  }).success, false);
  assert.equal(createTenderSchemaForCatalog(published).safeParse({
    projectName: 'Facing brick package',
    category: 'Materials',
    subcategory: 'Bricks',
    item: 'Engineering bricks only',
    location: 'Leeds LS10 2AB',
    quantity: '2000 units',
    itemDescription: 'Facing bricks to the published specification including delivery assumptions.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Brick supply against the published catalog family after the ops rename.',
    spec: { dimension: '215 mm', materialClass: 'engineering', standard: 'BS EN 771-1', pack: 'pack' },
  }).success, true);
});

test('the seed register schema still accepts current catalog provisions', () => {
  assert.equal(registerSchema.safeParse({
    email: 'seed-catalog@example.test',
    password: 'StrongPassword!1',
    contactName: 'Seed Tester',
    role: 'USER',
    termsAccepted: true,
    privacyAccepted: true,
    companyName: 'Seed Ltd',
    categories: ['Materials'],
    serviceProvisions: ['Materials::Bricks'],
  }).success, true);
});

test('catalog version changes when Super User definitions change', () => {
  const first = publishedCatalogVersion([{ updatedAt: new Date('2026-09-22T10:00:00.000Z') }]);
  const second = publishedCatalogVersion([{ updatedAt: new Date('2026-09-22T12:00:00.000Z') }]);
  assert.notEqual(first, second);
  assert.deepEqual(catalogServiceNames(cloneCatalog(seedCatalog())).sort(), catalogServiceNames(seedCatalog()).sort());
});
