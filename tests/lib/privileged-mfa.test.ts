import assert from 'node:assert/strict';
import test from 'node:test';
import { privilegedMfaSatisfied } from '../../src/server/auth/session';
import { readFileSync } from 'node:fs';
import { devPaymentConfirmationAllowed } from '../../src/server/payments/paymentService';

test('privileged MFA is required for Owner, not for Super User or marketplace Users', () => {
  assert.equal(privilegedMfaSatisfied({ role: 'USER', isOwner: false, mfaEnabled: false }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: false, mfaEnabled: false }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: false, mfaEnabled: true }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: false }), false);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: true }), true);
});

test('Owner APIs and the Owner console require MFA enrollment; Super User does not', () => {
  const session = readFileSync('src/server/auth/session.ts', 'utf8');
  const proxy = readFileSync('src/proxy.ts', 'utf8');
  const workspace = readFileSync('src/app/api/auth/workspace/route.ts', 'utf8');
  const auth = readFileSync('src/server/auth/auth.ts', 'utf8');
  const mfaRoute = readFileSync('src/app/api/auth/mfa/route.ts', 'utf8');
  assert.match(session, /MFA_SETUP_REQUIRED/);
  assert.match(session, /export async function requireOwner[\s\S]*privilegedMfaSatisfied\(user\)/);
  assert.doesNotMatch(session, /export async function requireFullSuperUser[\s\S]*privilegedMfaSatisfied\(user\)/);
  assert.match(proxy, /\/super-user\/owner/);
  assert.match(proxy, /\/account\/security/);
  assert.doesNotMatch(workspace, /\/account\/security/);
  assert.match(auth, /user\.isOwner && user\.mfaEnabled/);
  assert.match(mfaRoute, /requireOwnerAccount/);
});

test('dev payment confirmation is disabled in production', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(devPaymentConfirmationAllowed(), false);
  } finally {
    process.env.NODE_ENV = previous;
  }
});
