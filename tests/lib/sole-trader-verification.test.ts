import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isSoleTraderEvidenceSufficient, isDocumentApplicableForProfile, getApplicableVerificationDocuments } from '../../src/lib/verification-documents';

test('sole trader evidence rule: one strong document, or at least two distinct moderate documents, is sufficient', () => {
  assert.equal(isSoleTraderEvidenceSufficient([]), false);
  assert.equal(isSoleTraderEvidenceSufficient(['BUSINESS_BANK_STATEMENT']), false);
  assert.equal(isSoleTraderEvidenceSufficient(['BUSINESS_BANK_STATEMENT', 'BUSINESS_BANK_STATEMENT']), false);
  assert.equal(isSoleTraderEvidenceSufficient(['BUSINESS_BANK_STATEMENT', 'CUSTOMER_INVOICES']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['HMRC_UTR_CONFIRMATION']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['SA302_TAX_CALCULATION']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['VAT_REGISTRATION_CERTIFICATE']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['CIS_REGISTRATION_PROOF']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['PUBLIC_LIABILITY_INSURANCE']), true);
  assert.equal(isSoleTraderEvidenceSufficient(['PROFESSIONAL_INDEMNITY_INSURANCE']), true);
});

test('sole trader evidence types are excluded from the category-based checklist but applicable for sole trader profiles', () => {
  const applicable = getApplicableVerificationDocuments(['Materials']);
  assert.equal(applicable.some((document) => document.type === 'HMRC_UTR_CONFIRMATION'), false);
  assert.equal(applicable.some((document) => document.type === 'BUSINESS_BANK_STATEMENT'), false);

  assert.equal(isDocumentApplicableForProfile('HMRC_UTR_CONFIRMATION', ['Materials'], true), true);
  assert.equal(isDocumentApplicableForProfile('HMRC_UTR_CONFIRMATION', ['Materials'], false), false);
  assert.equal(isDocumentApplicableForProfile('CERTIFICATE_OF_INCORPORATION', ['Materials'], true), true);
});

test('sole trader profiles can be AI verified using self-employment evidence', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const profileRoute = readFileSync('src/app/api/retailer/profile/route.ts', 'utf8');
  const verificationRoute = readFileSync('src/app/api/retailer/verification/route.ts', 'utf8');
  const verificationDocumentService = readFileSync('src/server/domain/verificationDocumentService.ts', 'utf8');
  const quoteService = readFileSync('src/server/domain/quoteService.ts', 'utf8');

  assert.match(schema, /isSoleTrader\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /enum CompanyType/);
  assert.match(schema, /companyType\s+CompanyType/);
  assert.match(profileRoute, /companyType/);
  assert.doesNotMatch(verificationRoute, /Sole trader profiles cannot be AI verified/);
  assert.match(verificationRoute, /evaluateSoleTraderVerification/);
  assert.match(verificationDocumentService, /evaluateSoleTraderVerification/);
  assert.match(quoteService, /providerIsSoleTrader/);
});

test('provider profile and verification pages support the sole trader evidence flow', () => {
  const profilePage = readFileSync('src/app/retailer/profile/page.tsx', 'utf8');
  const verificationPage = readFileSync('src/app/retailer/verification/page.tsx', 'utf8');

  assert.match(profilePage, /companyType/);
  assert.doesNotMatch(profilePage, /Sole trader profiles cannot be AI verified/);
  assert.match(verificationPage, /soleTraderEvidence/);
  assert.doesNotMatch(verificationPage, /Sole traders cannot be AI verified/);
});

test('verification policy and quote comparison document all 6 verification levels and use approved banner labels', () => {
  const policyPage = readFileSync('src/app/policies/[slug]/page.tsx', 'utf8');
  const quoteComparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');

  // Documentation levels
  assert.match(policyPage, /Sole trader AI Verified/);
  assert.match(policyPage, /Incorporated AI Verified/);
  assert.match(policyPage, /Enhanced Bronze Verification/);
  assert.match(policyPage, /Enhanced Silver Verification/);
  assert.match(policyPage, /Enhanced Gold Verification/);

  // Banner labels
  assert.match(quoteComparison, />Unverified</);
  assert.match(quoteComparison, />Sole Trader</);
  assert.match(quoteComparison, />Verified</);
  assert.match(quoteComparison, />Bronze</);
  assert.match(quoteComparison, />Silver</);
  assert.match(quoteComparison, />Gold</);
});
