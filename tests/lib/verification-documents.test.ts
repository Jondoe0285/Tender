import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getApplicableVerificationDocuments,
  getRequiredVerificationDocumentTypes,
  isVerificationDocumentApplicable,
  verificationDocumentExpires,
} from '../../src/lib/verification-documents';

test('maps mandatory verification evidence to the selected services', () => {
  assert.deepEqual(getRequiredVerificationDocumentTypes(['Materials']), [
  ]);
  assert.deepEqual(getRequiredVerificationDocumentTypes(['Plant Hire']), [
  ]);
  assert.deepEqual(getRequiredVerificationDocumentTypes(['Waste']), [
    'WASTE_CARRIERS_LICENCE',
  ]);
  assert.deepEqual(getRequiredVerificationDocumentTypes(['Professional Services']), [
  ]);
});

test('makes Certificate of Incorporation mandatory for incorporated company types and optional for sole traders', () => {
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'LIMITED_COMPANY').includes('CERTIFICATE_OF_INCORPORATION'), true);
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'LIMITED_LIABILITY_PARTNERSHIP').includes('CERTIFICATE_OF_INCORPORATION'), true);
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'PUBLIC_LIMITED_COMPANY').includes('CERTIFICATE_OF_INCORPORATION'), true);
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'SOLE_TRADER', null, true).includes('CERTIFICATE_OF_INCORPORATION'), false);
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'LIMITED_COMPANY', null, true).includes('CERTIFICATE_OF_INCORPORATION'), false);
  assert.equal(getRequiredVerificationDocumentTypes(['Materials'], 'PARTNERSHIP').includes('CERTIFICATE_OF_INCORPORATION'), false);
});

test('required status takes precedence across multiple selected categories and requirement overrides', () => {
  const multiCategory = getRequiredVerificationDocumentTypes(['Materials', 'Waste'], 'LIMITED_COMPANY');
  assert.equal(multiCategory.includes('WASTE_CARRIERS_LICENCE'), true);

  const overrides = { 'Waste:PUBLIC_LIABILITY_INSURANCE': true, 'Materials:PUBLIC_LIABILITY_INSURANCE': false };
  const overridden = getRequiredVerificationDocumentTypes(['Materials', 'Waste'], 'LIMITED_COMPANY', overrides);
  assert.equal(overridden.includes('PUBLIC_LIABILITY_INSURANCE'), true);
});

test('does not apply service-specific documents to unrelated services', () => {
  assert.equal(isVerificationDocumentApplicable('WASTE_CARRIERS_LICENCE', ['Materials']), false);
  assert.equal(isVerificationDocumentApplicable('PROFESSIONAL_INDEMNITY_INSURANCE', ['Plant Hire']), false);
  assert.equal(isVerificationDocumentApplicable('SSIP_ACCREDITATION', ['Materials']), true);
});

test('Certificate of Incorporation does not require an expiry date, unlike other document types', () => {
  assert.equal(verificationDocumentExpires('CERTIFICATE_OF_INCORPORATION'), false);
  assert.equal(verificationDocumentExpires('PUBLIC_LIABILITY_INSURANCE'), true);
  assert.equal(verificationDocumentExpires('WASTE_CARRIERS_LICENCE'), true);
});
