import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSafeAttachmentName, verifyTenderAttachment } from '../../src/lib/attachment-utils';

test('normalises upload names and keeps the file extension safe', () => {
  assert.equal(buildSafeAttachmentName('Project Plan (Final).pdf'), 'project-plan-final.pdf');
  assert.equal(buildSafeAttachmentName('../../../secret.docx'), 'secret.docx');
  assert.equal(buildSafeAttachmentName('report'), 'report');
});

test('uses decoded bytes and file signatures to verify tender attachments', () => {
  const attachment = verifyTenderAttachment({
    name: 'site-plan.pdf',
    mimeType: 'application/pdf',
    dataBase64: Buffer.from('%PDF-1.7\nTender plan').toString('base64'),
  });

  assert.equal(attachment.mimeType, 'application/pdf');
  assert.equal(attachment.sizeBytes, Buffer.byteLength('%PDF-1.7\nTender plan'));
});

test('rejects MIME spoofing and active PDF content', () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.throws(() => verifyTenderAttachment({
    name: 'site-plan.png',
    mimeType: 'application/pdf',
    dataBase64: pngBytes.toString('base64'),
  }), /signature/);
  assert.throws(() => verifyTenderAttachment({
    name: 'site-plan.pdf',
    mimeType: 'application/pdf',
    dataBase64: Buffer.from('%PDF-1.7\n/OpenAction << /JS (alert) >>').toString('base64'),
  }), /Active PDF/);
});
