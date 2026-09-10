import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getApplicableVerificationDocuments,
  getRequiredVerificationDocumentTypes,
  isVerificationDocumentApplicable,
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

test('keeps legal-entity and employment-dependent documents optional', () => {
  const applicable = getApplicableVerificationDocuments(['Materials']);
  const incorporation = applicable.find((document) => document.type === 'CERTIFICATE_OF_INCORPORATION');
  const employersLiability = applicable.find((document) => document.type === 'EMPLOYERS_LIABILITY_INSURANCE');

  assert.equal(incorporation?.required, false);
  assert.equal(employersLiability?.required, false);
});

test('does not apply service-specific documents to unrelated services', () => {
  assert.equal(isVerificationDocumentApplicable('WASTE_CARRIERS_LICENCE', ['Materials']), false);
  assert.equal(isVerificationDocumentApplicable('PROFESSIONAL_INDEMNITY_INSURANCE', ['Plant Hire']), false);
  assert.equal(isVerificationDocumentApplicable('SSIP_ACCREDITATION', ['Materials']), true);
});
