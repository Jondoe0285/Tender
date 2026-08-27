import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageUserAccounts, isManagedAccountRole } from '../../src/lib/admin-permissions';

test('allows the Super User role to administer account management', () => {
  assert.equal(canManageUserAccounts('SUPER_USER'), true);
  assert.equal(canManageUserAccounts('CLIENT'), false);
  assert.equal(canManageUserAccounts(undefined), false);
});

test('only supports Client and Retailer roles for account creation', () => {
  assert.equal(isManagedAccountRole('CLIENT'), true);
  assert.equal(isManagedAccountRole('RETAILER'), true);
  assert.equal(isManagedAccountRole('SUPER_USER'), false);
  assert.equal(isManagedAccountRole('UNKNOWN'), false);
});
