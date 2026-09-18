import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Tender Management lists only high-severity tender compliance flags', () => {
  const page = readFileSync('src/app/super-user/tenders/page.tsx', 'utf8');

  assert.match(page, /getComplianceOverview/);
  assert.match(page, /flag\.severity === 'HIGH' && flag\.targetType === 'Tender'/);
  assert.match(page, /where: \{ id: \{ in: highRiskTenderIds \} \}/);
  assert.match(page, /No high-risk tenders are currently detected/);
});