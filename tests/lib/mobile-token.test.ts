import assert from 'node:assert/strict';
import test from 'node:test';
import { issueMobileToken, verifyMobileToken } from '../../src/server/auth/mobileToken';

test('issues and verifies a mobile access token', async () => {
  const previousSecret = process.env.MOBILE_AUTH_SECRET;
  process.env.MOBILE_AUTH_SECRET = 'a'.repeat(32);
  try {
    const token = await issueMobileToken({ userId: 'user-123', role: 'USER', authVersion: 0 });
    const identity = await verifyMobileToken(token);
    assert.equal(identity?.userId, 'user-123');
    assert.equal(identity?.role, 'USER');
    assert.equal(identity?.authVersion, 0);
    assert.equal(typeof identity?.issuedAt, 'number');
  } finally {
    process.env.MOBILE_AUTH_SECRET = previousSecret;
  }
});

test('rejects malformed mobile access tokens', async () => {
  const previousSecret = process.env.MOBILE_AUTH_SECRET;
  process.env.MOBILE_AUTH_SECRET = 'a'.repeat(32);
  try {
    assert.equal(await verifyMobileToken('not-a-token'), null);
  } finally {
    process.env.MOBILE_AUTH_SECRET = previousSecret;
  }
});

test('rejects a token signed with a different mobile secret', async () => {
  const previousSecret = process.env.MOBILE_AUTH_SECRET;
  try {
    process.env.MOBILE_AUTH_SECRET = 'a'.repeat(32);
    const token = await issueMobileToken({ userId: 'user-123', role: 'USER', authVersion: 0 });
    process.env.MOBILE_AUTH_SECRET = 'b'.repeat(32);
    assert.equal(await verifyMobileToken(token), null);
  } finally {
    process.env.MOBILE_AUTH_SECRET = previousSecret;
  }
});

test('requires a configured mobile token secret', async () => {
  const previousSecret = process.env.MOBILE_AUTH_SECRET;
  delete process.env.MOBILE_AUTH_SECRET;
  try {
    await assert.rejects(issueMobileToken({ userId: 'user-123', role: 'USER', authVersion: 0 }), /MOBILE_AUTH_SECRET/);
  } finally {
    process.env.MOBILE_AUTH_SECRET = previousSecret;
  }
});