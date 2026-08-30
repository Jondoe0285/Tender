import assert from 'node:assert/strict';
import test from 'node:test';
import { submitQuoteSchema } from '../../src/lib/schemas/quote';

test('accepts a complete formal quote', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: '2450' }],
    charges: [{ description: 'Delivery to site', priceGbp: '120' }],
    leadTimeDays: '14',
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: '30',
  });

  assert.equal(result.success, true);
});

test('rejects a quote item without a description or price', () => {
  const missingPrice = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: 2450 }],
    charges: [{ description: 'Supply of driver' }],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });
  const missingDescription = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: 2450 }],
    charges: [{ description: '', priceGbp: 120 }],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });

  assert.equal(missingPrice.success, false);
  assert.equal(missingDescription.success, false);
});

test('rejects a quote without commercial delivery information', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: 2450 }],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'No',
    validityDays: 30,
  });

  assert.equal(result.success, false);
});

test('rejects a quote line without a price', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: 0 }],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });

  assert.equal(result.success, false);
});

test('accepts an unavailable tender item alongside priced lines', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [
      { tenderItemId: 'tender-item-1', available: true, priceGbp: 2450 },
      { tenderItemId: 'tender-item-2', available: false },
    ],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });

  assert.equal(result.success, true);
});

test('rejects a quote that cannot supply any tender item', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: false }],
    leadTimeDays: 14,
    deliveryDateConfirmed: true,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });

  assert.equal(result.success, false);
});

test('requires a retailer delivery-date confirmation', () => {
  const result = submitQuoteSchema.safeParse({
    lineItems: [{ tenderItemId: 'tender-item-1', available: true, priceGbp: 2450 }],
    leadTimeDays: 14,
    deliveryInfo: 'Delivery available Tuesday to Thursday, included in price.',
    validityDays: 30,
  });

  assert.equal(result.success, false);
});
