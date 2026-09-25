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

test('rejects image uploads for automated verification', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const result = uploadVerificationDocumentSchema.safeParse({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    name: 'certificate.png',
    mimeType: 'image/png',
    sizeBytes: png.length,
    dataBase64: png.toString('base64'),
  });
  assert.equal(result.success, false);
});

test('rejects verification payloads larger than the 2 MB cap', () => {
  const result = uploadVerificationDocumentSchema.safeParse(pdfPayload({
    sizeBytes: 3 * 1024 * 1024,
    dataBase64: 'A'.repeat(Math.ceil(2 * 1024 * 1024 * 4 / 3) + 8),
  }));
  assert.equal(result.success, false);
});
