import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('User activity history has filterable unlock and quote metrics', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/app/retailer/billing/page.tsx'), 'utf8');

  assert.ok(source.includes("'7d'"));
  assert.ok(source.includes("'30d'"));
  assert.ok(source.includes("'90d'"));
  assert.ok(source.includes('all:'));
  assert.ok(source.includes("label: 'Tenders unlocked'"));
  assert.ok(source.includes("label: 'Quotes provided'"));
  assert.ok(source.includes("label: 'Quotes accepted'"));
  assert.ok(source.includes("status: 'ACCEPTED'"));
});