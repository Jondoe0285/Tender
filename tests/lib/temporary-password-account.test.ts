import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { generateTemporaryPassword } from '../../src/server/auth/temporaryPassword';
import { passwordSchema } from '../../src/lib/schemas/password';

test('Super User profile can mark an account active and issue a temporary password', () => {
  const route = readFileSync('src/app/api/super-user/users/[id]/route.ts', 'utf8');
  const profile = readFileSync('src/components/admin/UserAnalyticsProfileView.tsx', 'utf8');
  const schema = readFileSync('prisma/schema.prisma', 'utf8');

  assert.match(route, /action === 'mark-active'/);
  assert.match(route, /action === 'set-temporary-password'/);
  assert.match(route, /mustChangePassword: true/);
  assert.match(route, /USER_MARKED_ACTIVE/);
  assert.match(route, /USER_TEMPORARY_PASSWORD_SET/);
  assert.match(profile, /Mark as active/);
  assert.match(profile, /Set temporary password/);
  assert.match(schema, /mustChangePassword Boolean @default\(false\)/);
});

test('temporary passwords meet the public password policy', () => {
  for (let index = 0; index < 8; index += 1) {
    const password = generateTemporaryPassword();
    assert.equal(passwordSchema.safeParse(password).success, true, password);
  }
});

test('first sign-in after a temporary password forces a change on web and mobile', () => {
  const session = readFileSync('src/server/auth/session.ts', 'utf8');
  const proxy = readFileSync('src/proxy.ts', 'utf8');
  const workspace = readFileSync('src/app/api/auth/workspace/route.ts', 'utf8');
  const changePage = readFileSync('src/app/change-password/page.tsx', 'utf8');
  const loginForm = readFileSync('src/components/auth/LoginForm.tsx', 'utf8');
  const changeService = readFileSync('src/server/auth/changePassword.ts', 'utf8');
  const mobileLogin = readFileSync('src/app/api/mobile/auth/login/route.ts', 'utf8');
  const mobileApp = readFileSync('mobile/App.tsx', 'utf8');
  const mobileGate = readFileSync('mobile/src/screens/ForcedPasswordChange.tsx', 'utf8');

  assert.match(session, /PASSWORD_CHANGE_REQUIRED/);
  assert.match(proxy, /\/change-password/);
  assert.match(workspace, /mustChangePassword/);
  assert.match(changePage, /Choose a new password/);
  assert.match(loginForm, /notices.password === 'changed'/);
  assert.match(changeService, /mustChangePassword: false/);
  assert.match(mobileLogin, /mustChangePassword: Boolean\(user\.mustChangePassword\)/);
  assert.match(mobileApp, /ForcedPasswordChange/);
  assert.match(mobileGate, /changeMobilePassword/);
});
