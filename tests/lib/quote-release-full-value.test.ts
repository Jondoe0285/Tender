import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('accepted quote release fee is based on the full submitted quote value', () => {
  const contactReleaseService = readFileSync('src/server/domain/contactReleaseService.ts', 'utf8');
  const paymentService = readFileSync('src/server/payments/paymentService.ts', 'utf8');
  const acceptRoute = readFileSync('src/app/api/quotes/[id]/accept/route.ts', 'utf8');

  assert.match(contactReleaseService, /getClientReleaseFeeGbp\(quote\.priceGbp\)/);
  assert.match(contactReleaseService, /createPayment\(\{ type: 'CLIENT_RELEASE', userId: clientId, quoteId, quotePriceGbp: quote\.priceGbp/);
  assert.doesNotMatch(acceptRoute, /selected|lineIds|quoteLineIds|partial/i);
  assert.match(paymentService, /params\.type === 'INDEPENDENT_REVIEW' && params\.feeOverrideGbp !== undefined/);
});

test('quote comparison tells the user acceptance applies to the full quote value', () => {
  const quoteComparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');
  const clientTenderPage = readFileSync('src/app/client/tenders/[id]/page.tsx', 'utf8');

  assert.match(quoteComparison, /Accept full quote/);
  assert.match(quoteComparison, /Full submitted quote value/);
  assert.match(clientTenderPage, /full submitted quote value, not selected quote lines/);
});
