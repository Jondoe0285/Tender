import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSafeAttachmentName } from '../../src/lib/attachment-utils';

test('normalises upload names and keeps the file extension safe', () => {
  assert.equal(buildSafeAttachmentName('Project Plan (Final).pdf'), 'project-plan-final.pdf');
  assert.equal(buildSafeAttachmentName('../../../secret.docx'), 'secret.docx');
  assert.equal(buildSafeAttachmentName('report'), 'report');
});
