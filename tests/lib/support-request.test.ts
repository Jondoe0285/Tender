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

test('uses an Owner-only configured recipient and minimizes support notification data', () => {
  const settingsRoute = readFileSync('src/app/api/super-user/settings/route.ts', 'utf8');
  const settingsService = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const supportService = readFileSync('src/server/domain/supportRequestService.ts', 'utf8');
  const templates = readFileSync('src/server/notifications/emailTemplates.ts', 'utf8');
  assert.match(settingsRoute, /requireOwner\(\)/);
  assert.match(settingsRoute, /rejectCrossOrigin\(request\)/);
  assert.match(settingsRoute, /supportRecipientEmail: z\.string\(\)\.trim\(\)\.toLowerCase\(\)\.email\(\)\.max\(254\)/);
  assert.match(settingsService, /getAdminSettings\(includeSupportRecipient = false\)/);
  assert.match(settingsService, /includeSupportRecipient \? \{ supportRecipientEmail/);
  assert.match(supportService, /getSupportRecipientEmail\(\)/);
  assert.match(supportService, /SUPPORT_REQUEST_NOTIFICATION_\$\{deliveryStatus\}/);
  assert.match(templates, /supportRequestNotificationTemplate/);
  assert.match(templates, /intentionally excludes requester and protected tender, contact, payment, and request-detail data/);
});