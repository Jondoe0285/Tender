import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { consumeRecoveryCode, encryptMfaSecret, decryptMfaSecret, hashRecoveryCode } from '../../src/server/auth/mfa';

test('MFA secrets round-trip through encryption and recovery codes are single-use', () => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-mfa';
  const encrypted = encryptMfaSecret('JBSWY3DPEHPK3PXP');
  assert.equal(decryptMfaSecret(encrypted), 'JBSWY3DPEHPK3PXP');

  const hashes = JSON.stringify([hashRecoveryCode('ABCD-EFGH')]);
  const consumed = consumeRecoveryCode(hashes, 'ABCD-EFGH');
  assert.equal(consumed.valid, true);
  assert.deepEqual(consumed.remaining, []);
  assert.equal(consumeRecoveryCode(JSON.stringify(consumed.remaining), 'ABCD-EFGH').valid, false);
});

test('MFA enrollment keeps the current session valid until the code is verified', () => {
  const route = readFileSync('src/app/api/auth/mfa/route.ts', 'utf8');
  const beginBlock = route.slice(route.indexOf("parsed.data.action === 'begin'"), route.indexOf('const account = await prisma.user.findUnique'));

  assert.doesNotMatch(beginBlock, /sessionVersion/);
  assert.match(route, /MFA_ENABLED/);
  assert.match(route, /MFA_DISABLED/);
});

test('MFA settings load current enabled state before showing setup controls', () => {
  const source = readFileSync('src/components/auth/MfaSettings.tsx', 'utf8');

  assert.match(source, /fetch\('\/api\/auth\/mfa'\)/);
  assert.match(source, /setEnabled\(Boolean\(data\?\.enabled\)\)/);
});