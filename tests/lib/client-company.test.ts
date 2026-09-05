import assert from 'node:assert/strict';
import test from 'node:test';
import { isPrimaryClientUser } from '../../src/lib/client-company';

test('identifies only the assigned Client company primary user', () => {
  assert.equal(isPrimaryClientUser('primary-user', 'primary-user'), true);
  assert.equal(isPrimaryClientUser('primary-user', 'additional-user'), false);
});