import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadVerificationDocumentSchema } from '../../src/lib/schemas/verificationDocument';

function pdfPayload(overrides: Record<string, unknown> = {}) {
  return {
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    name: 'certificate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 20,
    dataBase64: Buffer.from('%PDF-1.7\nCertificate of Incorporation').toString('base64'),
    ...overrides,
  };
}

test('does not require an expiry date for a Certificate of Incorporation', () => {
  const result = uploadVerificationDocumentSchema.safeParse(pdfPayload());
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.expiryDate, null);
});

test('still requires a future expiry date for document types that expire', () => {
  const missing = uploadVerificationDocumentSchema.safeParse(pdfPayload({ documentType: 'PUBLIC_LIABILITY_INSURANCE' }));
  assert.equal(missing.success, false);

  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const valid = uploadVerificationDocumentSchema.safeParse(pdfPayload({ documentType: 'PUBLIC_LIABILITY_INSURANCE', expiryDate: future }));
  assert.equal(valid.success, true);
});
