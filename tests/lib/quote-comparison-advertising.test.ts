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