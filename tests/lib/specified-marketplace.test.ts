import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSpecPreview, specIssues } from '../../src/lib/tender-spec';
import { pricedQuoteLine } from '../../src/lib/quote-pricing';
import { harvestUnlockCount } from '../../src/lib/harvest';
import { defaultLaunchCreditExpiry, effectiveLaunchCredits } from '../../src/lib/launch-credits';
import { createTenderSchema } from '../../src/lib/schemas/tender';

test('waste lines require EWC, hazardous flag, container, and tonnes', () => {
  const missing = specIssues('Waste', {}, '2 skips');
  assert.ok(missing.length > 0);
  assert.deepEqual(specIssues('Waste', { ewcCode: '17 09 04', hazardous: false, container: 'skip' }, '8 tonnes'), []);
  const parsed = createTenderSchema.safeParse({
    projectName: 'Site clearance waste',
    category: 'Waste',
    subcategory: 'Mixed construction and demolition waste',
    item: 'Non-hazardous mixed skips from general site clearance',
    location: 'Leeds LS10 2AB',
    quantity: '8 tonnes',
    itemDescription: 'Non-hazardous mixed C&D waste from enabling works with transfer note assumptions.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Waste package for enabling works.',
    spec: { ewcCode: '17 09 04', hazardous: false, container: 'skip' },
  });
  assert.equal(parsed.success, true);
  assert.equal(createTenderSchema.safeParse({
    projectName: 'Site clearance waste',
    category: 'Waste',
    subcategory: 'Mixed construction and demolition waste',
    item: 'Non-hazardous mixed skips from general site clearance',
    location: 'Leeds LS10 2AB',
    quantity: '2 skips',
    itemDescription: 'Non-hazardous mixed C&D waste from enabling works with transfer note assumptions.',
    urgency: 'standard',
    closingDate: '2099-08-27',
    description: 'Waste package for enabling works.',
  }).success, false);
});

test('materials and plant specs are typed, not essays', () => {
  assert.deepEqual(specIssues('Materials', {}, '20 tonnes'), []);
  assert.deepEqual(specIssues('Materials', { dimension: '20 mm', materialClass: 'Type 1', standard: 'SHW Clause 803', pack: 'bulk' }, '20 tonnes'), []);
  assert.deepEqual(specIssues('Plant Hire', { plantClass: 'Excavators', capacity: '3 tonnes', period: '2 weeks' }, '2 weeks'), []);
  assert.equal(formatSpecPreview({ ewcCode: '17 05 04', hazardous: false, container: 'skip' }).includes('EWC'), true);
});

test('specified quote lines are unit rate times quantity', () => {
  const priced = pricedQuoteLine({ category: 'Materials', quantity: '20 tonnes' }, { available: true, unitRateGbp: 42.5, pricingKind: 'UNIT' });
  assert.equal(priced.error, undefined);
  assert.equal(priced.line.priceGbp, 850);
  assert.equal(priced.line.unit, 'tonnes');
  const lumpRejected = pricedQuoteLine({ category: 'Waste', quantity: '8 tonnes' }, { available: true, priceGbp: 1200, pricingKind: 'LUMP' });
  assert.equal(lumpRejected.error, 'Quote specified lines as a unit rate times quantity');
});

test('harvest cap counts unlocks without quotes', () => {
  assert.equal(harvestUnlockCount([{ tenderId: 'a' }, { tenderId: 'b' }, { tenderId: 'c' }], [{ tenderId: 'b' }]), 2);
});

test('launch credits expire', () => {
  const future = defaultLaunchCreditExpiry();
  assert.equal(effectiveLaunchCredits(3, future) > 0, true);
  assert.equal(effectiveLaunchCredits(3, new Date('2020-01-01T00:00:00.000Z')), 0);
});
