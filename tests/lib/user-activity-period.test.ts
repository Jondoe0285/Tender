import assert from 'node:assert/strict';
import test from 'node:test';
import { getActivitySince } from '../../src/server/domain/userProfileService';

test('activity periods support the one-day default and searchable retained ranges', () => {
  const now = Date.now();
  const oneDay = getActivitySince('1d');
  const thirtyDays = getActivitySince('30d');

  assert.ok(oneDay);
  assert.ok(thirtyDays);
  assert.ok(now - oneDay.getTime() >= 24 * 60 * 60 * 1000);
  assert.ok(now - thirtyDays.getTime() >= 30 * 24 * 60 * 60 * 1000);
  assert.equal(getActivitySince('all'), null);
});