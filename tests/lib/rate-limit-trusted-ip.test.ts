import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { checkRateLimit, resolveClientIp } from '../../src/server/http/rateLimit';

test('login, register, and password-reset routes apply rate limits with Retry-After', () => {
  const login = readFileSync('src/app/api/auth/[...nextauth]/route.ts', 'utf8');
  const register = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  const reset = readFileSync('src/app/api/auth/reset-password/route.ts', 'utf8');
  const limiter = readFileSync('src/server/http/rateLimit.ts', 'utf8');
  assert.match(login, /createRateLimitResponse\(request, 'login'/);
  assert.match(register, /createRateLimitResponse\(request, 'register'/);
  assert.match(reset, /createRateLimitResponse\(request, 'password-reset'/);
  assert.match(limiter, /'Retry-After'/);
  assert.match(readFileSync('render.yaml', 'utf8'), /TRUSTED_CLIENT_IP_HEADER/);
});

test('production ignores spoofed x-forwarded-for and uses only the trusted edge header', () => {
  const previousEnv = process.env.NODE_ENV;
  const previousHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  process.env.NODE_ENV = 'production';
  process.env.TRUSTED_CLIENT_IP_HEADER = 'x-real-ip';
  try {
    assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '203.0.113.20' })), '203.0.113.20');
    assert.equal(resolveClientIp(new Headers({ 'x-forwarded-for': '198.51.100.1' })), 'unknown');
  } finally {
    process.env.NODE_ENV = previousEnv;
    if (previousHeader === undefined) delete process.env.TRUSTED_CLIENT_IP_HEADER;
    else process.env.TRUSTED_CLIENT_IP_HEADER = previousHeader;
  }
});

test('production rate limits spoofed forwarded-for separately from the trusted IP', async () => {
  const previousEnv = process.env.NODE_ENV;
  const previousHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  process.env.NODE_ENV = 'production';
  process.env.TRUSTED_CLIENT_IP_HEADER = 'x-real-ip';
  const scope = `prod-ip-${randomUUID()}`;
  try {
    const trusted = new Headers({ 'x-real-ip': '203.0.113.40', 'x-forwarded-for': '198.51.100.9' });
    const spoofOnly = new Headers({ 'x-forwarded-for': '198.51.100.9' });
    assert.equal((await checkRateLimit(trusted, scope, { maxRequests: 2, windowMs: 60_000 })).allowed, true);
    assert.equal((await checkRateLimit(trusted, scope, { maxRequests: 2, windowMs: 60_000 })).allowed, true);
    const thirdTrusted = await checkRateLimit(trusted, scope, { maxRequests: 2, windowMs: 60_000 });
    assert.equal(thirdTrusted.allowed, false);
    assert.ok(thirdTrusted.retryAfterSeconds >= 1);
    assert.equal((await checkRateLimit(spoofOnly, scope, { maxRequests: 2, windowMs: 60_000 })).allowed, true);
  } finally {
    process.env.NODE_ENV = previousEnv;
    if (previousHeader === undefined) delete process.env.TRUSTED_CLIENT_IP_HEADER;
    else process.env.TRUSTED_CLIENT_IP_HEADER = previousHeader;
  }
});
