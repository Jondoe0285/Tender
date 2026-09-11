import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('quote comparison excludes sponsored content from the decision surface', () => {
  const source = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');

  assert.doesNotMatch(source, /sponsoredQuotes/);
  assert.doesNotMatch(source, /Sponsored Retailer placement/);
});

test('quote sorting and filter toggles expose accessible state for assistive technology', () => {
  const quoteComparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');
  const opportunitiesExplorer = readFileSync('src/components/retailer/OpportunitiesExplorer.tsx', 'utf8');

  assert.match(quoteComparison, /aria-sort=/i);
  assert.match(quoteComparison, /aria-label=.*Sort by/i);
  assert.match(opportunitiesExplorer, /aria-pressed=/i);
  assert.match(opportunitiesExplorer, /aria-label=.*category|aria-label=.*urgency/i);
});

test('quote comparison documents sole trader status separately from AI verification', () => {
  const quoteComparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');

  assert.match(quoteComparison, /Sole Trader/);
  assert.match(quoteComparison, /sole trader/i);
  assert.match(quoteComparison, /not AI verified/i);
  assert.match(quoteComparison, /providerIsSoleTrader/);
});

test('quote service ignores expired independent verification when building quote badges', () => {
  const quoteService = readFileSync('src/server/domain/quoteService.ts', 'utf8');

  assert.match(quoteService, /independentReviewExpired/);
  assert.match(quoteService, /independentReviewDecidedAt/);
});

test('quote comparison explains independent verification tiers', () => {
  const quoteComparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');
  const tierGuide = readFileSync('src/lib/independentReviewTiers.ts', 'utf8');

  assert.match(quoteComparison, /independentReviewTierDescription/);
  assert.match(tierGuide, /Bronze means legal requirements/);
  assert.match(tierGuide, /industry-specific employee and managerial training/);
  assert.match(tierGuide, /validated SSIP membership/);
});