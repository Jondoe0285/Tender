import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { signInAllowed } from '../../src/server/auth/signInAccess';

test('Owner can always sign in; everyone else follows the Owner gate', () => {
  assert.equal(signInAllowed({ isOwner: false }, true), true);
  assert.equal(signInAllowed({ isOwner: true }, true), true);
  assert.equal(signInAllowed({ isOwner: true }, false), true);
  assert.equal(signInAllowed({ isOwner: false }, false), false);
});

test('sign-in starts open, registration does not use the gate, and Owner can close it', () => {
  const settings = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const auth = readFileSync('src/server/auth/auth.ts', 'utf8');
  const register = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  const ownerPanel = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');
  const login = readFileSync('src/components/auth/LoginForm.tsx', 'utf8');
  const loginPage = readFileSync('src/app/login/page.tsx', 'utf8');
  const mobile = readFileSync('src/app/api/mobile/auth/login/route.ts', 'utf8');
  const settingsRoute = readFileSync('src/app/api/super-user/settings/route.ts', 'utf8');

  assert.match(settings, /SIGN_IN_ACTIVE: 'true'/);
  assert.match(settings, /export async function isSignInActive/);
  assert.match(auth, /signInAllowed\(user, await isSignInActive\(\)\)/);
  assert.match(auth, /LOGIN_DISABLED/);
  assert.doesNotMatch(register, /isSignInActive/);
  assert.match(ownerPanel, /Close sign in/);
  assert.match(ownerPanel, /SIGN_IN_ACTIVE/);
  assert.match(settingsRoute, /SIGN_IN_ACTIVE/);
  assert.match(login, /LOGIN_DISABLED/);
  assert.match(loginPage, /isSignInActive/);
  assert.match(mobile, /LOGIN_DISABLED/);
});
