import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { partnerRequestSchema } from '../../src/lib/schemas/partners';

const partner = {
  name: 'Northline Safety',
  logoPath: '/images/partners/northline-safety.png',
  destinationUrl: 'https://northline.example/offer',
  displayLocation: 'FOOTER' as const,
  campaignSource: 'Autumn campaign',
  active: false,
};
const firstId = 'ck12345678901234567890123';
const secondId = 'ck12345678901234567890124';

test('accepts valid partner create and reorder requests', () => {
  assert.equal(partnerRequestSchema.safeParse({ action: 'create', partner }).success, true);
  assert.equal(partnerRequestSchema.safeParse({ action: 'create', partner: { ...partner, destinationUrl: undefined } }).success, true);
  assert.equal(partnerRequestSchema.safeParse({ action: 'reorder', displayLocation: 'FOOTER', orderedIds: [firstId, secondId] }).success, true);
});

test('rejects unsafe logo paths, non-HTTPS destinations, and duplicate partner order IDs', () => {
  assert.equal(partnerRequestSchema.safeParse({ action: 'create', partner: { ...partner, logoPath: '/images/../private/logo.png' } }).success, false);
  assert.equal(partnerRequestSchema.safeParse({ action: 'create', partner: { ...partner, destinationUrl: 'http://northline.example' } }).success, false);
  assert.equal(partnerRequestSchema.safeParse({ action: 'reorder', displayLocation: 'FOOTER', orderedIds: [firstId, firstId] }).success, false);
});

test('partner route requires full Super User access, cross-origin protection, and partner audit actions', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/app/api/super-user/partners/route.ts'), 'utf8');
  assert.match(source, /requireFullSuperUser/);
  assert.match(source, /rejectCrossOrigin/);
  for (const action of ['PARTNER_CREATED', 'PARTNER_UPDATED', 'PARTNER_ACTIVATED', 'PARTNER_DEACTIVATED', 'PARTNER_REORDERED']) assert.match(source, new RegExp(action));
});