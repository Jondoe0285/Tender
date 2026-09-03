import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageUserAccounts, isManagedAccountRole, canManagePlatformOwnership, isAccountantOnly } from '../../src/lib/admin-permissions';

test('allows the Super User role to administer account management', () => {
  assert.equal(canManageUserAccounts('SUPER_USER'), true);
  assert.equal(canManageUserAccounts('CONTRACTOR'), false);
  assert.equal(canManageUserAccounts(undefined), false);
});

test('only supports Client and Retailer roles for account creation', () => {
  assert.equal(isManagedAccountRole('CONTRACTOR'), true);
  assert.equal(isManagedAccountRole('PROVIDER'), true);
  assert.equal(isManagedAccountRole('SUPER_USER'), false);
  assert.equal(isManagedAccountRole('UNKNOWN'), false);
});

test('only grants platform ownership to Owner-flagged Super Users', () => {
  assert.equal(canManagePlatformOwnership({ role: 'SUPER_USER', isOwner: true }), true);
  assert.equal(canManagePlatformOwnership({ role: 'SUPER_USER', isOwner: false }), false);
  assert.equal(canManagePlatformOwnership({ role: 'CONTRACTOR', isOwner: true }), false);
  assert.equal(canManagePlatformOwnership(undefined), false);
  assert.equal(canManagePlatformOwnership(null), false);
});

test('only identifies Accountant-flagged Super Users as accountant-only', () => {
  assert.equal(isAccountantOnly({ role: 'SUPER_USER', isAccountant: true }), true);
  assert.equal(isAccountantOnly({ role: 'SUPER_USER', isAccountant: false }), false);
  assert.equal(isAccountantOnly({ role: 'PROVIDER', isAccountant: true }), false);
  assert.equal(isAccountantOnly(undefined), false);
  assert.equal(isAccountantOnly(null), false);
});
