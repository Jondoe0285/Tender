import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { tenderOpportunityTemplate } from '../../src/server/notifications/emailTemplates';

test('pre-unlock Provider data excludes the Contractor correlation identifier', () => {
  const tenderRoute = readFileSync('src/app/api/tenders/[id]/route.ts', 'utf8');
  const summaries = readFileSync('src/server/domain/tenderService.ts', 'utf8');
  const ProviderPage = readFileSync('src/app/retailer/tenders/[id]/page.tsx', 'utf8');

  assert.doesNotMatch(tenderRoute, /clientTradeTenderId/);
  assert.doesNotMatch(summaries, /clientTradeTenderId/);
  assert.doesNotMatch(ProviderPage, /clientTradeTenderId/);
});

test('pre-unlock opportunity email excludes the Contractor correlation identifier', () => {
  const previousAppUrl = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = 'https://tender.example.test';

  try {
    const template = tenderOpportunityTemplate({
      id: 'tender-1',
      reference: 'TEN-001',
      category: 'Materials / Aggregate',
      locationArea: 'Leeds (LS10)',
      closingDate: new Date('2026-10-01T00:00:00Z'),
      requirementSummary: 'MOT Type 1 - 20 tonnes',
    });

    assert.doesNotMatch(template.html, /Contractor Trade Tender ID/i);
    assert.doesNotMatch(template.html, /TT-CL-/);
  } finally {
    if (previousAppUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previousAppUrl;
  }
});