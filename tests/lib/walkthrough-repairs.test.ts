import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEmail, isAssignablePlatformOwnerEmail } from '../../src/lib/email-format';
import { normaliseOperatingLocations } from '../../src/lib/geography';
import { personNameFromAccount, splitContactName } from '../../src/lib/person-name';
import { buyingTenderPath, buyingTendersPath, supplyingTenderPath } from '../../src/lib/workspace-paths';
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
  assert.equal(isAssignablePlatformOwnerEmail('owner@example.test'), false);
  assert.equal(isAssignablePlatformOwnerEmail('owner@example.com'), false);
  assert.equal(isAssignablePlatformOwnerEmail('test'), false);
  assert.equal(isAssignablePlatformOwnerEmail('owner@tradetender.co.uk'), true);
  assert.equal(isAssignablePlatformOwnerEmail('james.sinclair@sinclairsafetysolutions.co.uk'), true);
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
  assert.equal(supplyingTenderPath('abc'), '/provider/tenders/abc');
  assert.match(tenders, /buyingTenderPath\(tender\.id\)/);
});

test('login and footer avoid hydration-unstable client APIs', () => {
  const login = readFileSync(path.join(process.cwd(), 'src/components/auth/LoginForm.tsx'), 'utf8');
  const loginPage = readFileSync(path.join(process.cwd(), 'src/app/login/page.tsx'), 'utf8');
  const footer = readFileSync(path.join(process.cwd(), 'src/components/layout/SiteFooter.tsx'), 'utf8');
  assert.doesNotMatch(login, /useSearchParams/);
  assert.match(loginPage, /await searchParams/);
  assert.doesNotMatch(footer, /getFullYear|Date\.now/);
  assert.match(footer, /Buyer decisions/);
  assert.doesNotMatch(footer, /pathname:/);
});

test('sandbox repair does not hash a password that fails policy', () => {
  const repair = readFileSync(path.join(process.cwd(), 'scripts/repair-sandbox-walkthrough.ts'), 'utf8');
  assert.match(repair, /passwordSchema/);
  assert.match(repair, /LOCAL_SANDBOX_PASSWORD/);
  assert.match(repair, /loginLockedUntil: null/);
});

test('workspace dashboards keep supplying tenders on /provider', () => {
  const dashboard = readFileSync(path.join(process.cwd(), 'src/app/client/page.tsx'), 'utf8');
  const retailerDashboard = readFileSync(path.join(process.cwd(), 'src/app/retailer/page.tsx'), 'utf8');
  assert.match(dashboard, /supplyingTenderPath/);
  assert.doesNotMatch(dashboard, /\/retailer\/tenders/);
  assert.match(retailerDashboard, /supplyingTenderPath/);
  assert.doesNotMatch(retailerDashboard, /\/retailer\/tenders/);
});
