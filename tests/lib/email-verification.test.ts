import assert from 'node:assert/strict';
import test from 'node:test';
import { hashVerificationToken } from '../../src/server/auth/emailVerification';

test('hashes verification tokens without retaining the raw token', () => {
  const token = 'verification-token-value';
  const tokenHash = hashVerificationToken(token);
  assert.notEqual(tokenHash, token);
  assert.equal(tokenHash, hashVerificationToken(token));
  assert.notEqual(tokenHash, hashVerificationToken('different-token-value'));
});