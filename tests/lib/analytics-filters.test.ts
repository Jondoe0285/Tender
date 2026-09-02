import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalyticsTenderWhere, parseAnalyticsFilters } from '../../src/server/domain/analyticsService';

test('parses supported analytics filters and rejects malformed query values', () => {
  const filters = parseAnalyticsFilters({
    client: '  Client Ltd ', retailer: 'Retailer Ltd', tenderReference: 'TND-20260902-000001', quoteReference: 'TND-20260902-000001-Q01',
    category: 'Materials', region: 'Leeds', status: 'ACCEPTED', from: '2026-09-01', to: '2026-09-02', valueBand: '5000_TO_9999', subscriptionPlan: 'Growth', paymentStatus: 'CONFIRMED',
  });

  assert.deepEqual(filters, {
    client: 'Client Ltd', retailer: 'Retailer Ltd', tenderReference: 'TND-20260902-000001', quoteReference: 'TND-20260902-000001-Q01',
    category: 'Materials', region: 'Leeds', status: 'ACCEPTED', valueBand: '5000_TO_9999', subscriptionPlan: 'Growth', paymentStatus: 'CONFIRMED',
    from: new Date('2026-09-01T00:00:00.000Z'), to: new Date('2026-09-02T23:59:59.999Z'),
  });
  assert.deepEqual(parseAnalyticsFilters({ paymentStatus: 'PAID' }), {});
  assert.deepEqual(parseAnalyticsFilters({ from: 'not-a-date' }), {});
});

test('builds reporting predicates without selecting personal data', () => {
  const where = buildAnalyticsTenderWhere(parseAnalyticsFilters({ retailer: 'Retailer Ltd', quoteReference: 'Q01', paymentStatus: 'CONFIRMED' }));
  assert.deepEqual(where, {
    AND: [
      {},
      { OR: [{ unlocks: { some: { retailer: { OR: [{ contactName: { contains: 'Retailer Ltd', mode: 'insensitive' } }, { email: { contains: 'Retailer Ltd', mode: 'insensitive' } }] } } } }, { quotes: { some: { retailer: { OR: [{ contactName: { contains: 'Retailer Ltd', mode: 'insensitive' } }, { email: { contains: 'Retailer Ltd', mode: 'insensitive' } }] } } } }] },
      { quotes: { some: { reference: { contains: 'Q01', mode: 'insensitive' } } } },
      { OR: [{ unlockPayments: { some: { status: 'CONFIRMED' } } }, { quotes: { some: { releasePayment: { is: { status: 'CONFIRMED' } } } } }] },
    ],
  });
});