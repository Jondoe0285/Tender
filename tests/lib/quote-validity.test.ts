import assert from 'node:assert/strict';
import test from 'node:test';
import { getQuoteExpiresAt, isQuoteExpired, QUOTE_EXPIRED_MESSAGE } from '../../src/server/domain/quoteService';

test('calculates quote expiry from submitted date and provider validity days', () => {
  const submittedAt = new Date('2026-09-01T09:30:00.000Z');

  assert.equal(getQuoteExpiresAt(submittedAt, 14).toISOString(), '2026-09-15T09:30:00.000Z');
  assert.equal(isQuoteExpired(submittedAt, 14, new Date('2026-09-15T09:30:00.000Z')), true);
  assert.equal(isQuoteExpired(submittedAt, 14, new Date('2026-09-14T23:59:59.000Z')), false);
});

test('uses the purchasing-client quote expiry message required by provider validity', () => {
  assert.equal(QUOTE_EXPIRED_MESSAGE, "This quote has exceeded the Provider's validity period and is no longer valid.");
});