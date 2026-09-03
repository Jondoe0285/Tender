import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const footerPath = path.join(process.cwd(), 'src/components/layout/SiteFooter.tsx');
const footerApiPath = path.join(process.cwd(), 'src/app/api/partners/footer/route.ts');

test('footer fetches active, ordered partner advertising from a server-only display endpoint', () => {
  const source = readFileSync(footerPath, 'utf8');
  const apiSource = readFileSync(footerApiPath, 'utf8');

  assert.match(source, /fetch\('\/api\/partners\/footer'\)/);
  assert.doesNotMatch(source, /from '@\/server\/data\/prisma'/);
  assert.match(apiSource, /prisma\.partner\.findMany/);
  assert.match(apiSource, /where: \{ active: true, displayLocation: 'FOOTER' \}/);
  assert.match(apiSource, /orderBy: \[\{ sortOrder: 'asc' \}, \{ name: 'asc' \}\]/);
  assert.match(apiSource, /select: \{ id: true, name: true, logoPath: true, destinationUrl: true \}/);
  assert.match(source, /Partner advertising is separate from tender matching, quote ranking, supplier selection, and Contractor decisions/);
  assert.match(source, /partner\.destinationUrl \?/);
  assert.doesNotMatch(source, /sinclairsafetysolutions\.co\.uk|smartworkscivils\.com/);
});