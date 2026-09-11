import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
const settingsPath = path.join(process.cwd(), 'src/server/domain/platformSettings.ts');
const servicePath = path.join(process.cwd(), 'src/server/domain/directContactService.ts');
const retailerTenderPath = path.join(process.cwd(), 'src/app/retailer/tenders/[id]/page.tsx');
const clientTenderPath = path.join(process.cwd(), 'src/app/client/tenders/[id]/page.tsx');

test('direct contact uses a dedicated payment-backed request model', () => {
  const schema = readFileSync(schemaPath, 'utf8');

  assert.match(schema, /DIRECT_CONTACT/);
  assert.match(schema, /model DirectContactRequest/);
  assert.match(schema, /paymentId\s+String\?\s+@unique/);
  assert.match(schema, /@@unique\(\[tenderId, requesterId\]\)/);
});

test('direct contact is owner controlled and disabled by default', () => {
  const settings = readFileSync(settingsPath, 'utf8');

  assert.match(settings, /DIRECT_CONTACT_ACTIVE: 'false'/);
  assert.match(settings, /DIRECT_CONTACT_FEE_GBP: '25'/);
  assert.match(settings, /isDirectContactActive/);
});

test('direct contact is limited to contractor and professional services tenders', () => {
  const service = readFileSync(servicePath, 'utf8');

  assert.match(service, /new Set\(\['Contractor Services', 'Professional Services'\]\)/);
  assert.match(service, /assertRetailerEligibleForTender/);
  assert.match(service, /assertTenderOpenForActivity/);
  assert.match(service, /DIRECT_CONTACT_RELEASED/);
});

test('direct contact UI protects the purchasing client contact details', () => {
  const providerPage = readFileSync(retailerTenderPath, 'utf8');
  const clientPage = readFileSync(clientTenderPath, 'utf8');

  assert.match(providerPage, /This does not release the Client&apos;s contact details to you/);
  assert.match(providerPage, /Share contact details/);
  assert.match(clientPage, /Your contact details remain private unless released through an approved workflow/);
});
