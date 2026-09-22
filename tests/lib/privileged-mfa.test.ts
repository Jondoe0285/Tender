import assert from 'node:assert/strict';
import test from 'node:test';
import { privilegedMfaSatisfied } from '../../src/server/auth/session';
import { readFileSync } from 'node:fs';
import { devPaymentConfirmationAllowed } from '../../src/server/payments/paymentService';

test('privileged MFA is required for Super User and Owner, not for marketplace Users', () => {
  assert.equal(privilegedMfaSatisfied({ role: 'USER', isOwner: false, mfaEnabled: false }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: false, mfaEnabled: false }), false);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: false }), false);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: true }), true);
});

test('admin APIs and the Super User portal require MFA enrollment before use', () => {
  const session = readFileSync('src/server/auth/session.ts', 'utf8');
  const proxy = readFileSync('src/proxy.ts', 'utf8');
  const workspace = readFileSync('src/app/api/auth/workspace/route.ts', 'utf8');
  assert.match(session, /MFA_SETUP_REQUIRED/);
  assert.match(session, /privilegedMfaSatisfied\(user\)/);
  assert.match(proxy, /\/account\/security/);
  assert.match(workspace, /\/account\/security/);
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
