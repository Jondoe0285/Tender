import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { OPPORTUNITY_MATCH_READ_LIMIT, openMatchedOpportunityWhere, openOpportunityTenderWhere } from '../../src/lib/opportunity-search';

test('opportunity inbox reads a bounded open-match index, not the Tender table', () => {
  const now = new Date('2026-09-23T12:00:00.000Z');
  assert.equal(OPPORTUNITY_MATCH_READ_LIMIT, 200);
  assert.deepEqual(openOpportunityTenderWhere(now), { status: 'OPEN', closingDate: { gt: now } });
  assert.deepEqual(openMatchedOpportunityWhere('retailer-1', now), {
    retailerId: 'retailer-1',
    tender: { status: 'OPEN', closingDate: { gt: now } },
  });

  const list = readFileSync('src/server/domain/tenderService.ts', 'utf8');
  assert.match(list, /openMatchedOpportunityWhere\(retailerId\)/);
  assert.match(list, /take: OPPORTUNITY_MATCH_READ_LIMIT/);
  assert.match(list, /viewedAt: null/);
  assert.match(list, /items: \{ some: \{ category: \{ in: categories \} \} \}/);
  assert.doesNotMatch(list, /where: \{ retailerId \}/);
});

test('match and quote retailer lookups have supporting indexes', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  assert.match(schema, /model TenderMatch \{[\s\S]*@@index\(\[retailerId, notifiedAt\]\)/);
  assert.match(schema, /model TenderMatch \{[\s\S]*@@index\(\[retailerId, viewedAt\]\)/);
  assert.match(schema, /model TenderItem \{[\s\S]*@@index\(\[category\]\)/);
  assert.match(schema, /model TenderPackage \{[\s\S]*@@index\(\[category\]\)/);
  assert.match(schema, /model Unlock \{[\s\S]*@@index\(\[retailerId\]\)/);
  assert.match(schema, /model Quote \{[\s\S]*@@index\(\[retailerId, submittedAt\]\)/);
  const migration = readFileSync('prisma/migrations/20260923140000_opportunity_search_indexes/migration.sql', 'utf8');
  assert.match(migration, /TenderMatch_retailerId_notifiedAt_idx/);
  assert.match(migration, /TenderItem_category_idx/);
});
