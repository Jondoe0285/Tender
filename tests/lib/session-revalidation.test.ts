import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCurrentUser, type CurrentAccount } from '../../src/server/auth/session';

const activeUser: CurrentAccount = {
  id: 'user-123', email: 'user@example.test', role: 'USER', suspended: false, isOwner: false, isAccountant: false, roleMemberships: [{ role: 'USER' }],
};

test('revalidates suspension before authorizing an existing session', () => {
  assert.equal(resolveCurrentUser({ userId: activeUser.id, requestedRole: 'USER' }, { ...activeUser, suspended: true }), null);
});

test('rejects a session role removed from current memberships', () => {
  assert.equal(resolveCurrentUser({ userId: activeUser.id, requestedRole: 'SUPER_USER' }, activeUser), null);
});

test('accepts an active current membership and returns refreshed claims', () => {
  assert.deepEqual(resolveCurrentUser({ userId: activeUser.id, requestedRole: 'USER' }, activeUser), {
    id: 'user-123', email: 'user@example.test', role: 'USER', roles: ['USER'], isOwner: false, isAccountant: false,
  });
});