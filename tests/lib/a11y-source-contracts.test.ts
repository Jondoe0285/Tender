import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('primary journeys keep associated labels, live regions, and 44px footer targets', () => {
  const opportunities = readFileSync('src/components/retailer/OpportunitiesExplorer.tsx', 'utf8');
  const comparison = readFileSync('src/components/quotes/QuoteComparison.tsx', 'utf8');
  const footer = readFileSync('src/components/layout/SiteFooter.tsx', 'utf8');
  const loadState = readFileSync('src/components/ui/PageLoadState.tsx', 'utf8');
  const fields = readFileSync('src/components/ui/Field.tsx', 'utf8');
  const shell = readFileSync('src/components/layout/AppShell.tsx', 'utf8');
  const skip = readFileSync('src/components/layout/SkipLink.tsx', 'utf8');

  assert.match(opportunities, /<fieldset/);
  assert.match(opportunities, /aria-pressed/);
  assert.match(comparison, /aria-live="polite"/);
  assert.match(footer, /min-h-11/);
  assert.doesNotMatch(footer, /getFullYear/);
  assert.match(loadState, /role="status"/);
  assert.match(fields, /export function Label/);
  assert.match(shell, /aria-controls="mobile-navigation-drawer"/);
  assert.match(shell, /h-11 w-11/);
  assert.doesNotMatch(shell, /text-site-white\/40/);
  assert.match(skip, /focus:min-h-11/);
  const header = readFileSync('src/components/ui/PageHeader.tsx', 'utf8');
  assert.match(header, /description \? <p className="mt-1 text-sm leading-6 text-foundation-navy">/);
});

test('repeatable browser/axe coverage is still required on a real device for first-journey QA', () => {
  const tracker = readFileSync('docs/Action-Tracker.md', 'utf8');
  assert.match(tracker, /real-device/);
});

test('the public header always pairs Sign in with Create account', () => {
  const header = readFileSync('src/components/layout/SiteHeader.tsx', 'utf8');
  assert.match(header, /href="\/login"/);
  assert.match(header, />\s*Sign in\s*</);
  assert.match(header, /href="\/register"/);
  assert.match(header, />\s*Create account\s*</);
  assert.match(header, /href="\/#how-it-works"/);
  assert.match(header, /href="\/#buying"/);
  assert.match(header, /href="\/#supplying"/);
  assert.doesNotMatch(header, /session/);
});
