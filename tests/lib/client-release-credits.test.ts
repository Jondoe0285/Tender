import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClientOverrideSummary, normalizeClientReleaseCredits } from '../../src/lib/client-release-credits';

test('normalizes client release credits to a non-negative integer', () => {
  assert.equal(normalizeClientReleaseCredits('7'), 7);
  assert.equal(normalizeClientReleaseCredits(12), 12);
  assert.throws(() => normalizeClientReleaseCredits(-1), /non-negative integer/);
});

test('builds a compact client override summary', () => {
  assert.equal(buildClientOverrideSummary('Northfield Developments', 3), 'Northfield Developments · 3 release credits');
  assert.equal(buildClientOverrideSummary('Northfield Developments', 0), 'Northfield Developments · 0 release credits');
});
