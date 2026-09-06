import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { supportRequestReviewSchema, supportRequestSchema } from '../../src/lib/schemas/supportRequest';

test('validates bounded support request input', () => {
  assert.equal(supportRequestSchema.safeParse({ type: 'CHANGE', title: 'Add a request workflow', description: 'Please add an approved workflow for controlled support and change requests.' }).success, true);
  assert.equal(supportRequestSchema.safeParse({ type: 'CHANGE', title: 'No', description: 'Too short' }).success, false);
});

test('requires a valid reviewed action and records Owner-only change approval', () => {
  assert.equal(supportRequestReviewSchema.safeParse({ action: 'approve', note: 'Approved for planned implementation.' }).success, true);
  assert.equal(supportRequestReviewSchema.safeParse({ action: 'approve', note: 'No' }).success, false);
  const service = readFileSync('src/server/domain/supportRequestService.ts', 'utf8');
  assert.match(service, /request\.type !== 'CHANGE' \|\| !reviewer\.isOwner/);
  assert.match(service, /SUPPORT_REQUEST_\$\{status\}/);
});