import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('User navigation displays an unread tender opportunity count from a protected endpoint', () => {
  const shell = readFileSync(path.join(root, 'src/components/layout/AppShell.tsx'), 'utf8');
  const endpoint = readFileSync(path.join(root, 'src/app/api/opportunities/unread/route.ts'), 'utf8');

  assert.ok(shell.includes("fetch('/api/opportunities/unread')"));
  assert.ok(shell.includes("item.href === '/user/opportunities'"));
  assert.ok(shell.includes('unreadOpportunityCount > 99 ? \'99+\' : unreadOpportunityCount'));
  assert.ok(endpoint.includes("requireRole('USER')"));
  assert.ok(endpoint.includes('listMatchedSummariesForRetailer(user.id)'));
  assert.ok(endpoint.includes('match.viewedAt === null'));
});