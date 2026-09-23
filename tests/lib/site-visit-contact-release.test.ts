import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createTenderSchema } from '../../src/lib/schemas/tender';
import { isSiteVisitService } from '../../src/lib/categories';
import { specIssues } from '../../src/lib/tender-spec';
import { tenderUsesFixedServiceRelease } from '../../src/server/domain/platformSettings';

test('contractor and professional packages are site-visit release services', () => {
  assert.equal(isSiteVisitService('Contractor Services'), true);
  assert.equal(isSiteVisitService('Professional Services'), true);
  assert.equal(isSiteVisitService('Materials'), false);
  assert.equal(tenderUsesFixedServiceRelease(['Contractor Services']), 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP');
  assert.equal(tenderUsesFixedServiceRelease(['Professional Services']), 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP');
  assert.equal(tenderUsesFixedServiceRelease(['Materials']), null);
});

test('waste still requires legal spec fields; materials extras are optional', () => {
  assert.ok(specIssues('Waste', {}, '8 tonnes').length > 0);
  assert.deepEqual(specIssues('Materials', {}, '20 tonnes'), []);
  assert.deepEqual(specIssues('Plant Hire', {}, '2 weeks'), []);
});

test('a contractor tender can be issued with only matching fields', () => {
  const parsed = createTenderSchema.safeParse({
    projectName: 'Scaffold to rear elevation',
    category: 'Contractor Services',
    subcategory: 'Scaffolding and access',
    location: 'Leeds LS10 2AB',
    quantity: 'not applicable',
    closingDate: '2099-08-27',
  });
  assert.equal(parsed.success, true);
});

test('unlock and tender APIs release buyer contact after the contractor fee', () => {
  const unlock = readFileSync('src/server/domain/unlockService.ts', 'utf8');
  const contact = readFileSync('src/server/domain/contactReleaseService.ts', 'utf8');
  const retailerPage = readFileSync('src/app/retailer/tenders/[id]/page.tsx', 'utf8');
  const tenderRoute = readFileSync('src/app/api/tenders/[id]/route.ts', 'utf8');

  assert.match(unlock, /releaseSiteVisitContact/);
  assert.match(contact, /SITE_VISIT_UNLOCK/);
  assert.match(contact, /getReleasedBuyerContact/);
  assert.match(tenderRoute, /buyerContact/);
  assert.match(tenderRoute, /releasedProviders/);
  assert.match(retailerPage, /Pay the fixed release fee/);
  assert.match(retailerPage, /Customer contact/);
});
