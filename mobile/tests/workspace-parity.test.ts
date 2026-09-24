import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('mobile workspace covers Buyer and Supplier SaaS destinations', () => {
  const app = readFileSync('App.tsx', 'utf8');
  const tabs = readFileSync('src/navigation/types.ts', 'utf8');
  assert.match(tabs, /Create tender/);
  assert.match(tabs, /My tenders/);
  assert.match(tabs, /Awarded/);
  assert.match(tabs, /Opportunities/);
  assert.match(tabs, /Submitted quotes/);
  assert.match(tabs, /Activity and payments/);
  assert.match(tabs, /Profile/);
  assert.match(tabs, /Support/);
  assert.match(app, /DashboardScreen/);
  assert.match(app, /CreateTenderScreen/);
  assert.match(app, /TenderScreen/);
  assert.match(app, /VerificationScreen/);
});

test('mobile registration and quote accept match the SaaS required fields', () => {
  const registration = readFileSync('src/api/registration.ts', 'utf8');
  const quotes = readFileSync('src/api/quotes.ts', 'utf8');
  const auth = readFileSync('src/screens/AuthFlow.tsx', 'utf8');
  assert.match(registration, /privacyAccepted: boolean/);
  assert.match(auth, /privacyAccepted/);
  assert.match(quotes, /purchaseOrderNumber/);
  assert.match(quotes, /declarationAccepted/);
  assert.match(quotes, /secondApproverEmail/);
});
