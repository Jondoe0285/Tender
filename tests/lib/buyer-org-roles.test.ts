import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ADDITIONAL_BUYER_DUTIES,
  BUYER_ORG_ROLE_DUTIES,
  buyerOrgRoleFromDuties,
  capabilitiesFromMembership,
  dutiesForBuyerOrgRole,
  hasBuyerDuty,
} from '../../src/lib/workspace-duties';
import { userNavForCapabilities } from '../../src/lib/navigation';

test('named org roles map to first-class duty sets', () => {
  assert.deepEqual(dutiesForBuyerOrgRole('BUYER'), ['RAISER', 'ESTIMATOR', 'APPROVER']);
  assert.deepEqual(dutiesForBuyerOrgRole('ESTIMATOR'), ['RAISER', 'ESTIMATOR']);
  assert.deepEqual(dutiesForBuyerOrgRole('AUDITOR'), ['AUDITOR']);
  assert.equal(hasBuyerDuty(ADDITIONAL_BUYER_DUTIES, 'APPROVER'), false);
  assert.equal(buyerOrgRoleFromDuties(BUYER_ORG_ROLE_DUTIES.BUYER.join(',')), 'BUYER');
  assert.equal(buyerOrgRoleFromDuties('RAISER,ESTIMATOR,AUDITOR'), 'ESTIMATOR');
  assert.equal(buyerOrgRoleFromDuties('AUDITOR', false), 'AUDITOR');
  assert.equal(buyerOrgRoleFromDuties(undefined, true), 'OWNER');
});

test('auditor capabilities are read-only for buying', () => {
  const auditor = capabilitiesFromMembership({ duties: 'AUDITOR', isPrimary: false });
  assert.equal(auditor.orgRole, 'AUDITOR');
  assert.equal(auditor.canRaiseTender, false);
  assert.equal(auditor.canAward, false);
  const buyer = capabilitiesFromMembership({ duties: BUYER_ORG_ROLE_DUTIES.BUYER.join(','), isPrimary: false });
  assert.equal(buyer.canRaiseTender, true);
  assert.equal(buyer.canAward, true);
  const owner = capabilitiesFromMembership({ duties: 'AUDITOR', isPrimary: true });
  assert.equal(owner.orgRole, 'OWNER');
  assert.equal(owner.canAward, true);
});

test('create-tender nav is hidden without raiser capability', () => {
  const raised = userNavForCapabilities(true).flatMap((group) => group.items.map((item) => item.href));
  const auditor = userNavForCapabilities(false).flatMap((group) => group.items.map((item) => item.href));
  assert.ok(raised.includes('/user/tenders/new'));
  assert.equal(auditor.includes('/user/tenders/new'), false);
  assert.ok(auditor.includes('/user/tenders'));
});

test('additional users are assigned named organisation roles, not duty ticks', () => {
  const profile = readFileSync('src/app/client/profile/page.tsx', 'utf8');
  const schema = readFileSync('src/lib/schemas/profile.ts', 'utf8');
  const api = readFileSync('src/app/api/client/profile/route.ts', 'utf8');
  assert.match(profile, /Organisation role/);
  assert.match(profile, /BUYER_ORG_ROLES/);
  assert.doesNotMatch(profile, /Buying duties/);
  assert.match(schema, /orgRole: z\.enum\(BUYER_ORG_ROLES\)/);
  assert.match(api, /dutiesForBuyerOrgRole/);
  assert.match(readFileSync('src/app/api/user/capabilities/route.ts', 'utf8'), /getBuyerCapabilities/);
});
