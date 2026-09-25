import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  assessVerificationDocument,
  extractDocumentText,
  extractExpiryDateFromText,
} from '../../src/server/domain/verificationAiAssessment';

async function pdfWithText(lines: string[]): Promise<Buffer> {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  let y = 780;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 18;
  }
  return Buffer.from(await document.save());
}

test('reads company name and document type from a certificate of incorporation PDF', async () => {
  const content = await pdfWithText([
    'Certificate of Incorporation',
    'Companies House',
    'Ridgeway Brickworks Ltd',
    'Company number 12345678',
  ]);
  const result = assessVerificationDocument({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    companyNumber: '12345678',
    address: null,
  });
  assert.equal(result.matchedDocumentType, true);
  assert.equal(result.matchedCompanyName, true);
  assert.equal(result.passed, true);
  assert.ok(result.confidencePercent >= 90);
});

test('extracts printable PDF text including company name and expiry', async () => {
  const content = await pdfWithText([
    'Certificate of Incorporation',
    'Ridgeway Brickworks Ltd',
    'Company number 12345678',
  ]);
  const text = extractDocumentText(content, 'application/pdf');
  assert.ok(text);
  assert.match(text, /certificate of incorporation/);
  assert.match(text, /ridgeway brickworks/);
});

test('reads company name, document type, and expiry from a public liability PDF', async () => {
  const expiry = new Date(Date.UTC(2027, 8, 23));
  const content = await pdfWithText([
    'Public Liability Insurance',
    'Insured: Ridgeway Brickworks Ltd',
    'Expiry: 23 September 2027',
  ]);
  const result = assessVerificationDocument({
    documentType: 'PUBLIC_LIABILITY_INSURANCE',
    mimeType: 'application/pdf',
    content,
    expiryDate: expiry,
    companyName: 'Ridgeway Brickworks Ltd',
    companyNumber: '12345678',
    address: 'Leeds',
  });
  assert.equal(result.matchedDocumentType, true);
  assert.equal(result.classifiedType, 'PUBLIC_LIABILITY_INSURANCE');
  assert.equal(result.matchedCompanyName, true);
  assert.equal(result.extractedExpiryDate?.toISOString().slice(0, 10), '2027-09-23');
  assert.equal(result.matchedExpiryDate, true);
  assert.equal(result.passed, true);
  assert.ok(result.confidencePercent >= 90);
});

test('rejects a document whose text is a different document type', async () => {
  const content = await pdfWithText([
    'Tax Invoice',
    'Ridgeway Brickworks Ltd',
  ]);
  const result = assessVerificationDocument({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedDocumentType, false);
  assert.equal(result.passed, false);
});

test('rejects a document that does not name the registered company', async () => {
  const content = await pdfWithText([
    'Certificate of Incorporation',
    'Acme Scaffolding Ltd',
    'Companies House',
  ]);
  const result = assessVerificationDocument({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedCompanyName, false);
  assert.equal(result.passed, false);
});

test('rejects an entered expiry that does not match the date in the document', async () => {
  const content = await pdfWithText([
    'Waste Carriers Licence',
    'Environment Agency',
    'Ridgeway Brickworks Ltd',
    'Expiry: 23/09/2027',
  ]);
  const result = assessVerificationDocument({
    documentType: 'WASTE_CARRIERS_LICENCE',
    mimeType: 'application/pdf',
    content,
    expiryDate: new Date(Date.UTC(2028, 0, 1)),
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.extractedExpiryDate?.toISOString().slice(0, 10), '2027-09-23');
  assert.equal(result.matchedExpiryDate, false);
  assert.equal(result.passed, false);
});

test('cannot read company name, type, or expiry from a non-PDF file', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const result = assessVerificationDocument({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    mimeType: 'image/png',
    content: png,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedCompanyName, false);
  assert.equal(result.matchedDocumentType, false);
  assert.equal(result.extractedExpiryDate, null);
  assert.equal(result.passed, false);
});

test('extracts UK expiry dates from labelled text', () => {
  assert.equal(extractExpiryDateFromText('cover end 23/09/2027')?.toISOString().slice(0, 10), '2027-09-23');
});

test('reads uncompressed PDF string literals as a fallback', () => {
  const content = Buffer.from('%PDF-1.7\nBT (Certificate of Incorporation) Tj (Ridgeway Brickworks Ltd) Tj ET\n');
  const result = assessVerificationDocument({
    documentType: 'CERTIFICATE_OF_INCORPORATION',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedDocumentType, true);
  assert.equal(result.matchedCompanyName, true);
  assert.equal(result.passed, true);
});

test('passes an HMRC UTR PDF that names the registered company', async () => {
  const content = await pdfWithText([
    'HMRC Unique Taxpayer Reference',
    'Ridgeway Brickworks Ltd',
    'UTR 1234567890',
  ]);
  const result = assessVerificationDocument({
    documentType: 'HMRC_UTR_CONFIRMATION',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedDocumentType, true);
  assert.equal(result.matchedCompanyName, true);
  assert.equal(result.passed, true);
});

test('does not treat a stray CIS mention as CIS registration proof', async () => {
  const content = await pdfWithText([
    'Certificate of Incorporation',
    'Ridgeway Brickworks Ltd',
    'This filing mentions CIS in passing',
  ]);
  const result = assessVerificationDocument({
    documentType: 'CIS_REGISTRATION_PROOF',
    mimeType: 'application/pdf',
    content,
    expiryDate: null,
    companyName: 'Ridgeway Brickworks Ltd',
    address: null,
  });
  assert.equal(result.matchedDocumentType, false);
  assert.equal(result.passed, false);
});

test('caps inflated PDF streams so a highly compressed scan cannot exhaust memory', () => {
  const compressed = deflateSync(Buffer.alloc(16 * 1024 * 1024, 0x41));
  const header = Buffer.from(`%PDF-1.7\n1 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`);
  const pdf = Buffer.concat([header, compressed, Buffer.from('\nendstream\nendobj\n')]);
  const started = Date.now();
  const text = extractDocumentText(pdf, 'application/pdf');
  assert.ok(Date.now() - started < 2000);
  assert.ok((text ?? '').length < 80_000);
});
