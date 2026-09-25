import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('user workspace JSON APIs exist for mobile awarded, quotes, payments, and dashboard', () => {
  const awards = readFileSync('src/app/api/user/awards/route.ts', 'utf8');
  const quotes = readFileSync('src/app/api/user/quotes/route.ts', 'utf8');
  const payments = readFileSync('src/app/api/user/payments/route.ts', 'utf8');
  const dashboard = readFileSync('src/app/api/user/dashboard/route.ts', 'utf8');

  assert.match(awards, /requireRole\('USER'\)/);
  assert.match(awards, /prisma\.award\.findMany/);
  assert.match(quotes, /retailerId: user\.id/);
  assert.match(payments, /'7d'/);
  assert.match(payments, /'30d'/);
  assert.match(dashboard, /buyingQueue/);
  assert.match(dashboard, /supplyingQueue/);
});

test('professional interest and direct contact accept the mobile payment return header', () => {
  const interest = readFileSync('src/app/api/tenders/[id]/professional-interest/route.ts', 'utf8');
  const direct = readFileSync('src/app/api/tenders/[id]/direct-contact/route.ts', 'utf8');
  assert.match(interest, /x-mobile-payment-return/);
  assert.match(direct, /x-mobile-payment-return/);
});
