import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { QuoteComparison } from '../../src/components/quotes/QuoteComparison';

(globalThis as { React?: typeof React }).React = React;

const SECRET_EMAIL = 'secret-provider@example.test';
const SECRET_PHONE = '07700900099';
const SECRET_NAME = 'Secret Provider Identity';

const quote = {
  id: 'quote-privacy-1',
  reference: 'TND-20260918-000001-Q01',
  validityDays: 30,
  status: 'SUBMITTED' as const,
  submittedAt: '2026-09-18T10:00:00.000Z',
  expiresAt: '2026-10-18T10:00:00.000Z',
  expired: false as const,
  priceGbp: 1200,
  leadTimeDays: 5,
  deliveryDateConfirmed: true,
  deliveryInfo: 'Delivered to site compound',
  lines: [{
    tenderItemId: 'item-1',
    priceGbp: 1200,
    available: true,
    tenderItem: { category: 'Construction Materials', subcategory: 'Aggregate', item: 'MOT Type 1', quantity: '20 tonnes' },
  }],
  charges: [],
  releaseFeeGbp: 10,
  providerIsSoleTrader: false,
  providerVerificationStatus: 'UNVERIFIED' as const,
  verifiedDocumentLabels: [],
  independentlyVerified: false,
  independentReviewTier: null,
};

test('quote comparison HTML does not render Provider contact details before release', () => {
  const html = renderToStaticMarkup(createElement(QuoteComparison, {
    quotes: [quote],
    contacts: {},
    pendingPayment: null,
    busyQuoteId: null,
    onAccept() {},
    onSimulateReleasePayment() {},
    onLoadContact() {},
  }));

  assert.match(html, /TND-20260918-000001-Q01/);
  assert.doesNotMatch(html, new RegExp(SECRET_EMAIL));
  assert.doesNotMatch(html, new RegExp(SECRET_PHONE));
  assert.doesNotMatch(html, new RegExp(SECRET_NAME));
  assert.doesNotMatch(html, /@example\.test/);
  assert.doesNotMatch(html, /07\d{9}/);
});

test('quote comparison HTML only shows contact details after an authorised release payload is supplied', () => {
  const html = renderToStaticMarkup(createElement(QuoteComparison, {
    quotes: [{ ...quote, status: 'ACCEPTED' }],
    contacts: {
      'quote-privacy-1': { contactName: SECRET_NAME, contactPhone: SECRET_PHONE, email: SECRET_EMAIL },
    },
    pendingPayment: null,
    busyQuoteId: null,
    onAccept() {},
    onSimulateReleasePayment() {},
    onLoadContact() {},
  }));

  assert.match(html, new RegExp(SECRET_EMAIL));
  assert.match(html, new RegExp(SECRET_PHONE));
  assert.match(html, new RegExp(SECRET_NAME));
});
