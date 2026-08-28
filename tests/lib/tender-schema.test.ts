import assert from 'node:assert/strict';
import test from 'node:test';
import { createTenderSchema } from '../../src/lib/schemas/tender';
import { buildRetailerTenderSummary } from '../../src/server/domain/tenderService';
import { getBroadLocation } from '../../src/lib/geography';
import { isQuoteRetentionLocked } from '../../src/server/domain/quoteService';
import { getPurchasedRetentionDeadline, getUnpurchasedQuoteCutoff } from '../../src/server/domain/retentionService';
import { calculatePercentageFee } from '../../src/server/domain/platformSettings';

test('removes raw requirement detail from pre-unlock retailer summaries', () => {
  const summary = buildRetailerTenderSummary('Full specification: 40mm concrete, 3-week delivery window, site access required');

  assert.deepEqual(summary, ['Unlock required to view detailed requirements']);
});

test('reduces precise tender locations to a broad area before unlock', () => {
  assert.equal(getBroadLocation('42 Example Road, Leeds LS10 2AB'), 'Leeds');
  assert.equal(getBroadLocation('Bristol BS1 4DJ'), 'Bristol');
});

test('locks purchased quotes until their five-year retention deadline', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');

  assert.equal(isQuoteRetentionLocked(new Date('2031-08-28T12:00:01.000Z'), now), true);
  assert.equal(isQuoteRetentionLocked(new Date('2026-08-27T12:00:00.000Z'), now), false);
  assert.equal(isQuoteRetentionLocked(null, now), false);
});

test('calculates the 30-day cutoff for unpurchased quote deletion', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');

  assert.equal(getUnpurchasedQuoteCutoff(now).toISOString(), '2026-07-29T12:00:00.000Z');
});

test('sets purchased document retention for five years', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');

  assert.equal(getPurchasedRetentionDeadline(now).toISOString(), '2031-08-28T12:00:00.000Z');
});

test('uses separate percentage bands at the £10,000 quote boundary', () => {
  assert.equal(calculatePercentageFee(10000, 2, 4), 200);
  assert.equal(calculatePercentageFee(10001, 2, 4), 400.04);
  assert.equal(calculatePercentageFee(9999, 1.234, 4), 123.38);
});

test('accepts a valid structured construction tender', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Warehouse concrete supply',
    category: 'Materials',
    subcategory: 'Aggregates',
    location: 'Leeds LS10',
    quantity: '20 tonnes',
    urgency: 'standard',
    closingDate: '2099-08-27',
    budget: '1200',
    requirements: ['Delivery to site required'],
    description: 'Twenty tonnes of aggregate with delivery to the project site.',
  });

  assert.equal(result.success, true);
});

test('rejects a subcategory from a different category', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Plant requirement',
    category: 'Plant hire',
    subcategory: 'Aggregates',
    location: 'Leeds',
    quantity: '1 unit',
    urgency: 'urgent',
    closingDate: '2099-08-27',
    description: 'An excavator is required for groundworks on site.',
  });

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues.some((issue) => issue.path[0] === 'subcategory'), true);
});

test('rejects a closing date in the past', () => {
  const result = createTenderSchema.safeParse({
    projectName: 'Past requirement',
    category: 'Waste',
    subcategory: 'Skip hire',
    location: 'Leeds',
    quantity: '1 skip',
    urgency: 'standard',
    closingDate: '2020-01-01',
    description: 'This tender has a date that has already passed.',
  });

  assert.equal(result.success, false);
});
