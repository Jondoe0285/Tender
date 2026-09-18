import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('historical tender detail offers a re-tender action that opens an editable new-tender copy', () => {
  const detail = readFileSync(path.join(process.cwd(), 'src/app/client/tenders/[id]/page.tsx'), 'utf8');
  const builder = readFileSync(path.join(process.cwd(), 'src/app/client/tenders/new/page.tsx'), 'utf8');

  assert.ok(detail.includes('Re-tender'));
  assert.ok(detail.includes('/user/tenders/new?copyFrom='));
  assert.ok(builder.includes('loadTenderForRetender'));
  assert.ok(builder.includes('setFiles(attachments)'));
  assert.ok(builder.includes("closingDate: ''"));
});