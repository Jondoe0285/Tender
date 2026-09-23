import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('buying and supplying home screens lead with a this-week work queue', () => {
  const client = readFileSync('src/app/client/page.tsx', 'utf8');
  const retailer = readFileSync('src/app/retailer/page.tsx', 'utf8');
  const queue = readFileSync('src/components/work/WorkQueue.tsx', 'utf8');
  assert.match(client, /WorkQueue/);
  assert.match(client, /This week/);
  assert.match(client, /Review quotes/);
  assert.match(retailer, /WorkQueue/);
  assert.match(retailer, /Submit quote/);
  assert.match(queue, /<table/);
  assert.match(queue, /emptyAction/);
});
