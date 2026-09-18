import assert from 'node:assert/strict';
import test from 'node:test';
import { getMembershipContractExpiry } from '../../src/server/domain/membershipService';

test('membership contract expiry is calculated from the confirmed start date', () => {
  assert.equal(getMembershipContractExpiry(new Date('2026-09-06T10:00:00.000Z'), 6).toISOString(), '2027-03-06T10:00:00.000Z');
  assert.equal(getMembershipContractExpiry(new Date('2026-09-06T10:00:00.000Z'), 12).toISOString(), '2027-09-06T10:00:00.000Z');
});