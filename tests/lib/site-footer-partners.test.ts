import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const footerPath = path.join(process.cwd(), 'src/components/layout/SiteFooter.tsx');

test('footer renders only active, ordered partner advertising from the database', () => {
  const source = readFileSync(footerPath, 'utf8');

  assert.match(source, /prisma\.partner\.findMany/);
  assert.match(source, /where: \{ active: true, displayLocation: 'FOOTER' \}/);
  assert.match(source, /orderBy: \[\{ sortOrder: 'asc' \}, \{ name: 'asc' \}\]/);
  assert.match(source, /Partner advertising is separate from tender matching, quote ranking, supplier selection, and Contractor decisions/);
  assert.match(source, /partner\.destinationUrl \?/);
  assert.doesNotMatch(source, /sinclairsafetysolutions\.co\.uk|smartworkscivils\.com/);
});