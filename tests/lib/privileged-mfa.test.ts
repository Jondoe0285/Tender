import assert from 'node:assert/strict';
import test from 'node:test';
import { privilegedMfaSatisfied } from '../../src/server/auth/session';
import { superUserMfaSatisfied } from '../../src/server/auth/platformMfa';
import { readFileSync } from 'node:fs';
import { devPaymentConfirmationAllowed } from '../../src/server/payments/paymentService';

test('privileged MFA is required for Owner, not for marketplace Users', () => {
  assert.equal(privilegedMfaSatisfied({ role: 'USER', isOwner: false, mfaEnabled: false }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: false, mfaEnabled: false }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: false, mfaEnabled: true }), true);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: false }), false);
  assert.equal(privilegedMfaSatisfied({ role: 'SUPER_USER', isOwner: true, mfaEnabled: true }), true);
});

test('Super Users must enrol MFA once an Owner has activated it', () => {
  assert.equal(superUserMfaSatisfied({ role: 'USER', mfaEnabled: false }, true), true);
  assert.equal(superUserMfaSatisfied({ role: 'SUPER_USER', mfaEnabled: false }, false), true);
  assert.equal(superUserMfaSatisfied({ role: 'SUPER_USER', mfaEnabled: false }, true), false);
  assert.equal(superUserMfaSatisfied({ role: 'SUPER_USER', mfaEnabled: true }, true), true);
});

test('Owner APIs require Owner MFA; Super User APIs require MFA while the platform switch is on', () => {
  const session = readFileSync('src/server/auth/session.ts', 'utf8');
  const proxy = readFileSync('src/proxy.ts', 'utf8');
  const workspace = readFileSync('src/app/api/auth/workspace/route.ts', 'utf8');
  const layout = readFileSync('src/app/super-user/layout.tsx', 'utf8');
  const auth = readFileSync('src/server/auth/auth.ts', 'utf8');
  const mfaRoute = readFileSync('src/app/api/auth/mfa/route.ts', 'utf8');
  const securityPage = readFileSync('src/app/account/security/page.tsx', 'utf8');
  assert.match(session, /MFA_SETUP_REQUIRED/);
  assert.match(session, /export async function requireOwner[\s\S]*privilegedMfaSatisfied\(user\)/);
  assert.match(session, /export async function requireFullSuperUser[\s\S]*superUserMfaSatisfied/);
  assert.match(proxy, /\/super-user\/owner/);
  assert.match(proxy, /platformMfaActive/);
  assert.match(proxy, /\/account\/security/);
  assert.match(workspace, /\/account\/security/);
  assert.match(layout, /\/account\/security/);
  assert.match(auth, /if \(user\.mfaEnabled\)/);
  assert.doesNotMatch(auth, /user\.isOwner && user\.mfaEnabled/);
  assert.match(mfaRoute, /requireMfaEnrollmentAccount/);
  assert.match(mfaRoute, /requireOwnerAccount/);
  assert.match(mfaRoute, /where: \{ role: 'SUPER_USER', mfaEnabled: false \}/);
  assert.match(mfaRoute, /where: \{ mfaEnabled: true \}/);
  assert.match(mfaRoute, /deactivatedCount/);
  assert.match(securityPage, /isPlatformMfaActive/);
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
