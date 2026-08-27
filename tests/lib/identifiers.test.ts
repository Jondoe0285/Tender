import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuoteReference, buildTenderReference } from '../../src/lib/identifiers';

test('builds the approved tender reference format', () => {
  assert.equal(buildTenderReference(new Date('2026-08-27T12:00:00.000Z'), 42), 'TND-20260827-000042');
});

test('builds a linked quote reference', () => {
  assert.equal(buildQuoteReference('TND-20260827-000042', 3), 'TND-20260827-000042-Q03');
});
