import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const routePath = path.join(process.cwd(), 'src/app/api/super-user/users/[id]/route.ts');
const tablePath = path.join(process.cwd(), 'src/components/admin/AccountManagementTable.tsx');

test('Super User password resets issue the existing expiring reset link by email', () => {
  const source = readFileSync(routePath, 'utf8');

  assert.ok(source.includes('createPasswordResetToken(user.id)'));
  assert.ok(source.includes('passwordResetTemplate'));
  assert.ok(source.includes('sendTransactionalEmail'));
  assert.ok(!source.includes('temporaryPassword'));
});

test('Super User account deletion is authenticated, cross-origin protected, and audited', () => {
  const source = readFileSync(routePath, 'utf8');

  assert.ok(source.includes('export async function DELETE'));
  assert.ok(source.includes('rejectCrossOrigin(request)'));
  assert.ok(source.includes('requireFullSuperUser()'));
  assert.ok(source.includes("action: 'USER_DELETED'"));
  assert.ok(source.includes('hasRetainedActivity'));
});

test('account management tells administrators that reset links are emailed and exposes deletion', () => {
  const source = readFileSync(tablePath, 'utf8');

  assert.ok(source.includes('A password reset link has been sent'));
  assert.ok(source.includes("method: 'DELETE'"));
  assert.ok(source.includes('Delete account'));
});

test('Retailer management can filter accounts with matched open tender requests', () => {
  const source = readFileSync(tablePath, 'utf8');

  assert.ok(source.includes('openTenderRequestsOnly'));
  assert.ok(source.includes('Show Retailers with open tender requests only'));
  assert.ok(source.includes("rows.filter((row) => (row.openTenderRequests ?? 0) > 0)"));
});