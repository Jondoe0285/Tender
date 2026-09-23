import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEmail } from '../../src/lib/email-format';
import { normaliseOperatingLocations } from '../../src/lib/geography';
import { personNameFromAccount, splitContactName } from '../../src/lib/person-name';
import { buyingTenderPath, buyingTendersPath } from '../../src/lib/workspace-paths';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('maps stored towns onto county and region operating locations', () => {
  assert.deepEqual(
    normaliseOperatingLocations(['Birmingham', 'Cardiff', 'Manchester', 'Liverpool']),
    ['West Midlands', 'Wales', 'Greater Manchester', 'Merseyside'],
  );
  assert.deepEqual(normaliseOperatingLocations(['West Midlands', 'United Kingdom']), ['West Midlands', 'United Kingdom']);
});

test('splits company contact names into a person-shaped fallback', () => {
  assert.deepEqual(splitContactName('Ridgeway Brickworks Ltd', 'Ridgeway Brickworks Ltd'), { firstName: 'Primary', lastName: 'contact' });
  assert.deepEqual(personNameFromAccount({ firstName: 'Demo', lastName: 'Client', contactName: 'Demo Client' }), { firstName: 'Demo', lastName: 'Client' });
});

test('rejects placeholder support and owner addresses', () => {
  assert.equal(isValidEmail('owner@example.test'), true);
  assert.equal(isValidEmail('test'), false);
});

test('buying chrome stays on /user rather than /contractor', () => {
  const proxy = readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');
  const tenders = readFileSync(path.join(process.cwd(), 'src/app/client/tenders/page.tsx'), 'utf8');
  assert.ok(proxy.includes('client|contractor'));
  assert.ok(proxy.includes("'/user'"));
  assert.ok(!proxy.includes("replace(/^\\/client/, '/contractor')"));
  assert.ok(proxy.includes("/forbidden"));
  assert.equal(buyingTendersPath(), '/user/tenders');
  assert.equal(buyingTenderPath('abc'), '/user/tenders/abc');
  assert.match(tenders, /buyingTenderPath\(tender\.id\)/);
});
