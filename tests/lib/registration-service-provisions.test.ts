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

test('registration requires at least one provision when supplying services', () => {
  const result = registerSchema.safeParse({
    ...baseRegistration,
    categories: ['Materials'],
    serviceProvisions: [],
  });
  assert.equal(result.success, false);
});

test('registration rejects provisions outside the selected service', () => {
  const result = registerSchema.safeParse({
    ...baseRegistration,
    categories: ['Materials'],
    serviceProvisions: ['Waste::Inert waste'],
  });
  assert.equal(result.success, false);
});

test('registration is a stepped flow and buying accounts are not forced through supplier coverage', () => {
  const page = readFileSync('src/app/register/page.tsx', 'utf8');
  const form = readFileSync('src/app/register/RegisterForm.tsx', 'utf8');
  assert.doesNotMatch(form, /Coverage towns/);
  assert.doesNotMatch(form, /coverageAreas/);
  assert.match(page, /parseIntent/);
  assert.match(form, /workspace !== 'buying'/);
  assert.match(form, /<Stepper/);
});

test('registration, profile, and tender APIs consume the published catalog', () => {
  const register = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  const profile = readFileSync('src/app/api/client/profile/route.ts', 'utf8');
  const categories = readFileSync('src/app/api/categories/route.ts', 'utf8');
  const form = readFileSync('src/app/register/RegisterForm.tsx', 'utf8');
  assert.match(register, /createRegisterSchemaForCatalog\(await getCategoryCatalog\(\)\)/);
  assert.match(profile, /createProfileUpdateSchemaForCatalog\(await getCategoryCatalog\(\)\)/);
  assert.match(categories, /getPublishedCatalog/);
  assert.match(form, /fetch\('\/api\/categories'\)/);
});

test('registration writes coverage onto the company locations matching reads', () => {
  const route = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  assert.match(route, /operatingLocationsFromCoverage/);
  assert.match(route, /operatingLocations: operatingLocationsFromCoverage/);
});


test('registration requires privacy policy acknowledgement and records versioned acceptance evidence', () => {
  assert.equal(registerSchema.safeParse({ ...baseRegistration, privacyAccepted: false }).success, false);
  const route = readFileSync('src/app/api/auth/register/route.ts', 'utf8');
  assert.match(route, /termsVersion: CURRENT_TERMS_VERSION/);
  assert.match(route, /privacyVersion: CURRENT_PRIVACY_VERSION/);
  assert.match(route, /LEGAL_DOCUMENTS_ACCEPTED/);
});