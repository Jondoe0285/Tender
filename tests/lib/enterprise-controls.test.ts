import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isValidTenderQuantity } from '../../src/lib/categories';
import { isFourEyesSettingKey, isValidPurchaseOrderNumber, maskEmail } from '../../src/lib/enterprise-controls';
import { MEASURED_CONTRACTOR_UNITS } from '../../src/lib/tender-spec';
import { createTenderSchema } from '../../src/lib/schemas/tender';

test('masks marketplace emails on Super User lists', () => {
  assert.equal(maskEmail('buyer@example.test'), 'b•••@example.test');
  assert.equal(maskEmail('not-an-email'), 'Hidden');
});

test('requires a structured purchase order number', () => {
  assert.equal(isValidPurchaseOrderNumber('PO-2026-00412'), true);
  assert.equal(isValidPurchaseOrderNumber('AB'), false);
  assert.equal(isValidPurchaseOrderNumber('PO#1'), false);
});

test('four-eyes keys are VAT and fee modes only', () => {
  assert.equal(isFourEyesSettingKey('VAT_PERCENTAGE'), true);
  assert.equal(isFourEyesSettingKey('CLIENT_RELEASE_FEE_MODE'), true);
  assert.equal(isFourEyesSettingKey('RETAILER_UNLOCK_FEE_MODE'), true);
  assert.equal(isFourEyesSettingKey('CLIENT_RELEASE_FEE_GBP'), false);
});

test('contractor packages accept measured NRM units', () => {
  assert.deepEqual([...MEASURED_CONTRACTOR_UNITS], ['m', 'm²', 'm³', 'nr', 'item', 'week']);
  assert.equal(isValidTenderQuantity('Contractor Services', '120 m²'), true);
  assert.equal(isValidTenderQuantity('Contractor Services', '40 nr'), true);
  assert.equal(isValidTenderQuantity('Contractor Services', 'about 120 m²'), false);
});

test('accept, four-eyes, masking, conversion, and measured units are wired', () => {
  const accept = readFileSync('src/server/domain/contactReleaseService.ts', 'utf8');
  const acceptRoute = readFileSync('src/app/api/quotes/[id]/accept/route.ts', 'utf8');
  const settings = readFileSync('src/app/api/super-user/settings/route.ts', 'utf8');
  const waivers = readFileSync('src/app/api/super-user/owner/payment-waivers/route.ts', 'utf8');
  const ops = readFileSync('src/server/domain/opsExceptions.ts', 'utf8');
  const table = readFileSync('src/components/admin/AccountManagementTable.tsx', 'utf8');
  const dashboard = readFileSync('src/app/super-user/page.tsx', 'utf8');
  const compiler = readFileSync('src/app/client/tenders/new/page.tsx', 'utf8');
  const controls = readFileSync('src/server/domain/controlChangeService.ts', 'utf8');
  assert.match(accept, /isValidPurchaseOrderNumber/);
  assert.match(accept, /assertReleaseSpendCap/);
  assert.match(accept, /purchaseOrderNumber: poNumber/);
  assert.match(acceptRoute, /purchaseOrderNumber/);
  assert.match(settings, /proposeFeeChange/);
  assert.match(waivers, /proposeWaiverGrant/);
  assert.match(controls, /proposedById === confirmerId/);
  assert.match(ops, /maskEmail/);
  assert.match(ops, /ownersWithoutMfa/);
  assert.match(ops, /isAssignablePlatformOwnerEmail/);
  assert.match(table, /maskEmail\(account\.email\)/);
  assert.match(dashboard, /ConversionFunnel/);
  assert.match(dashboard, /RegisteredCompanyCounts/);
  assert.match(compiler, /MEASURED_CONTRACTOR_UNITS/);
  assert.match(readFileSync('src/components/admin/OpsExceptionBoard.tsx', 'utf8'), /Owner MFA/);
  assert.match(readFileSync('render.yaml', 'utf8'), /PLATFORM_OWNER_EMAIL/);
  assert.match(readFileSync('prisma/seed.ts', 'utf8'), /isAssignablePlatformOwnerEmail/);
});

test('contractor measured quantity passes the tender schema', () => {
  const parsed = createTenderSchema.safeParse({
    projectName: 'Drainage package',
    category: 'Contractor Services',
    subcategory: 'Scaffolding and access',
    item: 'Independent scaffolding',
    location: 'Leeds LS10 2AB',
    quantity: '120 m²',
    itemDescription: 'Install surface water drainage to the issued drawings, including connections and reinstatement.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Contractor drainage package with measured quantity.',
  });
  assert.equal(parsed.success, true);
});
