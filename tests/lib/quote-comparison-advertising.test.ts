import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('quote comparison excludes sponsored content from the decision surface', () => {
  const source = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');

  assert.doesNotMatch(source, /sponsoredQuotes/);
  assert.doesNotMatch(source, /Sponsored Retailer placement/);
});