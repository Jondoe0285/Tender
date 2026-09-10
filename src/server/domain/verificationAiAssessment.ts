import type { VerificationDocumentType } from '@/lib/verification-documents';

/**
 * Rule-based simulated document assessment (no external AI/OCR provider is configured for this
 * environment). It performs the same kind of checks a human reviewer would: does the evidence
 * plausibly belong to the registered company, is the expiry date still valid, and is the file a
 * type the system can read text from at all. The output is intentionally conservative — anything
 * it cannot confidently check is reflected as a lower confidence score and/or a forced human
 * review, never as an automatic pass.
 */

export type DocumentAssessmentInput = {
  documentType: VerificationDocumentType;
  mimeType: string;
  content: Buffer;
  expiryDate: Date | null;
  companyName: string;
  address: string | null;
};

export type DocumentAssessmentResult = {
  confidencePercent: number;
  requiresHumanReview: boolean;
  summary: string;
  matchedCompanyName: boolean;
  matchedAddress: boolean;
};

// Insurance and waste-permit evidence always needs a human reviewer regardless of AI score (per policy).
const ALWAYS_HUMAN_REVIEW_TYPES: readonly VerificationDocumentType[] = [
  'PUBLIC_LIABILITY_INSURANCE',
  'EMPLOYERS_LIABILITY_INSURANCE',
  'PROFESSIONAL_INDEMNITY_INSURANCE',
  'WASTE_CARRIERS_LICENCE',
];

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function significantCompanyTokens(companyName: string): string[] {
  const stopWords = new Set(['ltd', 'limited', 'llp', 'plc', 'the', 'and', 'co', 'company', 'group']);
  return normalise(companyName).split(' ').filter((token) => token.length > 2 && !stopWords.has(token));
}

function extractSearchableText(content: Buffer, mimeType: string): string | null {
  // Only PDFs store recoverable plain text in this environment; images would need real OCR.
  if (mimeType !== 'application/pdf') return null;
  return normalise(content.toString('latin1'));
}

export function assessVerificationDocument(input: DocumentAssessmentInput): DocumentAssessmentResult {
  const now = new Date();
  const daysUntilExpiry = input.expiryDate ? Math.floor((input.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
  const isImage = input.mimeType === 'image/jpeg' || input.mimeType === 'image/png';
  const text = extractSearchableText(input.content, input.mimeType);

  let confidencePercent = 60;
  const notes: string[] = [];

  if (daysUntilExpiry === null) {
    notes.push('This document type does not expire.');
  } else if (daysUntilExpiry < 0) {
    confidencePercent = 0;
    notes.push('Expiry date has already passed.');
  } else {
    notes.push(daysUntilExpiry > 30 ? `Expiry date is valid (${daysUntilExpiry} days remaining).` : `Expiry date is valid but expires soon (${daysUntilExpiry} days remaining).`);
    confidencePercent += daysUntilExpiry > 30 ? 5 : 0;
  }

  let matchedCompanyName = false;
  let matchedAddress = false;

  if (text) {
    const companyTokens = significantCompanyTokens(input.companyName);
    matchedCompanyName = companyTokens.length > 0 && companyTokens.some((token) => text.includes(token));
    notes.push(matchedCompanyName ? 'Registered company name was found in the document text.' : 'Registered company name was not found in the document text.');
    confidencePercent += matchedCompanyName ? 20 : -10;

    if (input.address) {
      const addressTokens = normalise(input.address).split(' ').filter((token) => token.length > 2);
      matchedAddress = addressTokens.length > 0 && addressTokens.some((token) => text.includes(token));
      notes.push(matchedAddress ? 'Registered address details were found in the document text.' : 'Registered address details were not found in the document text.');
      confidencePercent += matchedAddress ? 15 : 0;
    }
  } else {
    notes.push(isImage ? 'Document is an image; automated text extraction is not available so company and address details could not be checked.' : 'Document text could not be read.');
    confidencePercent = Math.min(confidencePercent, 70);
  }

  confidencePercent = Math.max(0, Math.min(100, confidencePercent));

  const forcedHumanReview = ALWAYS_HUMAN_REVIEW_TYPES.includes(input.documentType);
  const requiresHumanReview = forcedHumanReview || isImage || confidencePercent < 90;
  if (forcedHumanReview) notes.push('This document type always requires human review regardless of confidence score.');

  const summary = [
    `Automated assessment for ${input.documentType.replace(/_/g, ' ').toLowerCase()}.`,
    ...notes,
    `Confidence score: ${confidencePercent}%.`,
    `Human review required: ${requiresHumanReview ? 'yes' : 'no'}.`,
  ].join(' ');

  return { confidencePercent, requiresHumanReview, summary, matchedCompanyName, matchedAddress };
}
