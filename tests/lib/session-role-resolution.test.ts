import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCurrentUser, type CurrentAccount } from '../../src/server/auth/session';

function account(overrides: Partial<CurrentAccount> = {}): CurrentAccount {
  return {
    id: 'user-1',
    email: 'user@example.test',
    role: 'USER',
    suspended: false,
    isOwner: false,
    isAccountant: false,
    sessionVersion: 1,
    roleMemberships: [],
    ...overrides,
  };
}

test('resolves a session when the requested role matches the account role', () => {
  const result = resolveCurrentUser({ requestedRole: 'USER' }, account());
  assert.deepEqual(result, { id: 'user-1', email: 'user@example.test', role: 'USER', roles: ['USER'], isOwner: false, isAccountant: false });
});

test('rejects a null account (already revoked or never authenticated)', () => {
  assert.equal(resolveCurrentUser({ requestedRole: 'USER' }, null), null);
});

test('rejects a suspended account even with a matching role', () => {
  assert.equal(resolveCurrentUser({ requestedRole: 'USER' }, account({ suspended: true })), null);
});

test('rejects a role the account no longer holds, using multi-role membership', () => {
  const multiRole = account({ roleMemberships: [{ role: 'USER' }] });
  assert.equal(resolveCurrentUser({ requestedRole: 'SUPER_USER' }, multiRole), null);

  const superUser = account({ role: 'SUPER_USER', roleMemberships: [{ role: 'SUPER_USER' }, { role: 'USER' }] });
  const result = resolveCurrentUser({ requestedRole: 'USER' }, superUser);
  assert.deepEqual(result?.roles, ['SUPER_USER', 'USER']);
  assert.equal(result?.role, 'USER');
});
