import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { checkRateLimit } from '../../src/server/http/rateLimit';

test('allows a low number of requests from the same IP', async () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' });
  const scope = `register-${randomUUID()}`;
  const first = await checkRateLimit(headers, scope, { maxRequests: 5, windowMs: 60_000 });
  const second = await checkRateLimit(headers, scope, { maxRequests: 5, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
});

test('blocks requests that exceed the configured rate limit for the same IP', async () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.11' });
  const scope = `register-${randomUUID()}`;
  const results = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    results.push(await checkRateLimit(headers, scope, { maxRequests: 5, windowMs: 60_000 }));
  }

  assert.equal(results[0].allowed, true);
  assert.equal(results[1].allowed, true);
  assert.equal(results[2].allowed, true);
  assert.equal(results[3].allowed, true);
  assert.equal(results[4].allowed, true);
  assert.equal(results[5].allowed, false);
  assert.equal(results[5].retryAfterSeconds, 60);
});

test('treats different source IP addresses separately', async () => {
  const firstHeaders = new Headers({ 'x-forwarded-for': '203.0.113.12' });
  const secondHeaders = new Headers({ 'x-forwarded-for': '203.0.113.13' });
  const scope = `login-${randomUUID()}`;

  const first = await checkRateLimit(firstHeaders, scope, { maxRequests: 2, windowMs: 60_000 });
  const second = await checkRateLimit(secondHeaders, scope, { maxRequests: 2, windowMs: 60_000 });
  const third = await checkRateLimit(firstHeaders, scope, { maxRequests: 2, windowMs: 60_000 });
  const fourth = await checkRateLimit(firstHeaders, scope, { maxRequests: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(fourth.allowed, false);
});

test('allows requests after the rate-limit window expires', async () => {
  const originalDateNow = Date.now;
  let fakeNow = 1_700_000_000_000;
  Date.now = () => fakeNow;

  try {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.14' });
    const scope = `login-${randomUUID()}`;
    const initial = await checkRateLimit(headers, scope, { maxRequests: 2, windowMs: 60_000 });
    const second = await checkRateLimit(headers, scope, { maxRequests: 2, windowMs: 60_000 });
    const third = await checkRateLimit(headers, scope, { maxRequests: 2, windowMs: 60_000 });

    assert.equal(initial.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);

    fakeNow += 61_000;
    const afterExpiry = await checkRateLimit(headers, scope, { maxRequests: 2, windowMs: 60_000 });
    assert.equal(afterExpiry.allowed, true);
  } finally {
    Date.now = originalDateNow;
  }
});
