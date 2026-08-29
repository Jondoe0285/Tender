import assert from 'node:assert/strict';
import test from 'node:test';
import { checkRateLimit } from '../../src/server/http/rateLimit';

test('allows a low number of requests from the same IP', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' });
  const first = checkRateLimit(headers, 'register', { maxRequests: 5, windowMs: 60_000 });
  const second = checkRateLimit(headers, 'register', { maxRequests: 5, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
});

test('blocks requests that exceed the configured rate limit for the same IP', () => {
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.11' });
  const results = Array.from({ length: 6 }, () => checkRateLimit(headers, 'register', { maxRequests: 5, windowMs: 60_000 }));

  assert.equal(results[0].allowed, true);
  assert.equal(results[1].allowed, true);
  assert.equal(results[2].allowed, true);
  assert.equal(results[3].allowed, true);
  assert.equal(results[4].allowed, true);
  assert.equal(results[5].allowed, false);
  assert.equal(results[5].retryAfterSeconds, 60);
});

test('treats different source IP addresses separately', () => {
  const firstHeaders = new Headers({ 'x-forwarded-for': '203.0.113.12' });
  const secondHeaders = new Headers({ 'x-forwarded-for': '203.0.113.13' });

  const first = checkRateLimit(firstHeaders, 'login', { maxRequests: 2, windowMs: 60_000 });
  const second = checkRateLimit(secondHeaders, 'login', { maxRequests: 2, windowMs: 60_000 });
  const third = checkRateLimit(firstHeaders, 'login', { maxRequests: 2, windowMs: 60_000 });
  const fourth = checkRateLimit(firstHeaders, 'login', { maxRequests: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, true);
  assert.equal(fourth.allowed, false);
});

test('drops expired timestamps so stale rate-limit entries do not block future requests', () => {
  const originalDateNow = Date.now;
  let fakeNow = 1_700_000_000_000;
  Date.now = () => fakeNow;

  try {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.14' });
    const initial = checkRateLimit(headers, 'login', { maxRequests: 2, windowMs: 60_000 });
    const second = checkRateLimit(headers, 'login', { maxRequests: 2, windowMs: 60_000 });
    const third = checkRateLimit(headers, 'login', { maxRequests: 2, windowMs: 60_000 });

    assert.equal(initial.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);

    fakeNow += 61_000;
    const afterExpiry = checkRateLimit(headers, 'login', { maxRequests: 2, windowMs: 60_000 });
    assert.equal(afterExpiry.allowed, true);
  } finally {
    Date.now = originalDateNow;
  }
});
