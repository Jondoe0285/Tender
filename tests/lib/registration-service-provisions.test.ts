import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { registerSchema } from '../../src/lib/schemas/register';

const baseRegistration = {
  email: 'provisions@example.test',
  password: 'StrongPassword!1',
  contactName: 'Provision Tester',
  role: 'USER' as const,
  termsAccepted: true as const,
  privacyAccepted: true as const,
  companyName: 'Provision Test Ltd',
};

test('registration accepts optional valid second-tier service provisions', () => {
  const result = registerSchema.safeParse({
    ...baseRegistration,
    categories: ['Materials'],
    serviceProvisions: ['Materials::Bricks'],
  });
  assert.equal(result.success, true);
});

test('registration rejects provisions outside the selected service', () => {
  const result = registerSchema.safeParse({
    ...baseRegistration,
    categories: ['Materials'],
    serviceProvisions: ['Waste::Inert waste'],
  });
  assert.equal(result.success, false);
});

test('registration removes the coverage towns field', () => {
  const page = readFileSync('src/app/register/page.tsx', 'utf8');
  assert.doesNotMatch(page, /Coverage towns/);
  assert.doesNotMatch(page, /coverageAreas/);
});

test('registration requires privacy policy acknowledgement and records versioned acceptance evidence', () => {
  assert.equal(registerSchema.safeParse({ ...baseRegistration, privacyAccepted: false }).success, false);
  const route = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  assert.match(route, /termsVersion: CURRENT_TERMS_VERSION/);
  assert.match(route, /privacyVersion: CURRENT_PRIVACY_VERSION/);
  assert.match(route, /LEGAL_DOCUMENTS_ACCEPTED/);
});