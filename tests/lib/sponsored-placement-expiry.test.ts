import assert from 'node:assert/strict';
import test from 'node:test';
import { getSponsoredPlacementExpiry } from '../../src/server/domain/sponsoredPlacementService';

test('sponsored placement expires one calendar month after purchase', () => {
  assert.equal(getSponsoredPlacementExpiry(new Date('2026-01-31T12:00:00.000Z')).toISOString(), '2026-02-28T12:00:00.000Z');
  assert.equal(getSponsoredPlacementExpiry(new Date('2026-12-15T08:30:00.000Z')).toISOString(), '2027-01-15T08:30:00.000Z');
});