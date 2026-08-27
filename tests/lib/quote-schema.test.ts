import assert from 'node:assert/strict';
import test from 'node:test';
import { submitQuoteSchema } from '../../src/lib/schemas/quote';

test('accepts a complete formal quote', () => {
  const result = submitQuoteSchema.safeParse({
    priceGbp: '2450',
    leadTimeDays: '14',
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    accreditations: 'Constructionline Gold',
    validityDays: '30',
    notes: 'Price assumes clear site access and standard unloading.',
  });

  assert.equal(result.success, true);
});

test('rejects a quote without commercial delivery information', () => {
  const result = submitQuoteSchema.safeParse({
    priceGbp: 2450,
    leadTimeDays: 14,
    deliveryInfo: 'No',
    accreditations: 'None',
    validityDays: 30,
    notes: 'Price provided.',
  });

  assert.equal(result.success, false);
});
