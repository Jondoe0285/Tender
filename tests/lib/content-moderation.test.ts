import assert from 'node:assert/strict';
import test from 'node:test';
import { moderateContent } from '../../src/server/moderation/contentModeration';

test('allows ordinary commercial tender content', () => {
  const result = moderateContent([
    { name: 'description', value: 'Supply 20 tonnes of Type 1 aggregate for delivery next Tuesday.' },
    { name: 'notes', value: 'Please include lead time and trade price.' },
  ]);
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.riskScore, 0);
});

test('blocks contact details even when email separators are written as words', () => {
  const result = moderateContent([{ name: 'notes', value: 'Contact sales at supplier dot example.' }]);
  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.containsContactInfo, true);
  assert.match(result.reasons.join(' '), /Email address detected/);
});

test('requires review for business identifiers and precise postcodes', () => {
  const result = moderateContent([{ name: 'description', value: 'Northside Materials Ltd can deliver to B1 1AA.' }]);
  assert.equal(result.decision, 'REVIEW');
  assert.equal(result.containsCompanyInfo, true);
});

test('blocks requests to continue communication off platform', () => {
  const result = moderateContent([{ name: 'notes', value: 'Please message us directly to arrange collection.' }]);
  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.containsOffPlatformAttempt, true);
});

test('requires review for contract and purchase-order references', () => {
  const result = moderateContent([{ name: 'message', value: 'Please update contract number TT-4821 before delivery.' }]);
  assert.equal(result.decision, 'REVIEW');
  assert.match(result.reasons.join(' '), /Contract or purchase-order reference detected/);
});

test('screens structured fields and attachment filenames', () => {
  const result = moderateContent([
    { name: 'category', value: 'Construction Materials' },
    { name: 'attachment filename', value: 'contact at example dot com.pdf' },
  ]);
  assert.equal(result.decision, 'BLOCK');
  assert.equal(result.entities[0]?.field, 'attachment filename');
});