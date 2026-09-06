import assert from 'node:assert/strict';
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