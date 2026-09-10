import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the public policies page provides every document required by SEC-105', () => {
  const source = readFileSync('src/app/policies/page.tsx', 'utf8');
  const requiredIds = ['privacy', 'cookies', 'quote-retention', 'payments', 'contact-release', 'acceptable-use', 'platform-terms', 'marketplace-disclaimer'];
  for (const id of requiredIds) {
    assert.match(source, new RegExp(`id: '${id}'`), `Missing required policy section: ${id}`);
  }
});

test('Terms of Use and Privacy Policy display their tracked version so users can see when they last changed', () => {
  const source = readFileSync('src/app/policies/page.tsx', 'utf8');
  assert.match(source, /CURRENT_TERMS_VERSION/);
  assert.match(source, /CURRENT_PRIVACY_VERSION/);
  assert.match(source, /version: CURRENT_TERMS_VERSION/);
  assert.match(source, /version: CURRENT_PRIVACY_VERSION/);
});
