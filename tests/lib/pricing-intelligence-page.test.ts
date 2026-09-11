import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dashboardPath = path.join(process.cwd(), 'src/components/analytics/ExecutiveDashboard.tsx');
const pagePath = path.join(process.cwd(), 'src/app/super-user/pricing-intelligence/page.tsx');
const panelPath = path.join(process.cwd(), 'src/components/analytics/PricingIntelligencePanel.tsx');
const navigationPath = path.join(process.cwd(), 'src/lib/navigation.ts');

test('main dashboard keeps pricing intelligence as a summary chart only', () => {
  const source = readFileSync(dashboardPath, 'utf8');

  assert.match(source, /Overall estimate accuracy by product category/);
  assert.match(source, /data\.pricingIntelligence\.accuracyBands/);
  assert.match(source, /href="\/super-user\/pricing-intelligence"/);
  assert.doesNotMatch(source, /data\.pricingIntelligence\.tenders/);
});

test('pricing intelligence has a dedicated product-category page with offset controls', () => {
  assert.equal(existsSync(pagePath), true);
  const panel = readFileSync(panelPath, 'utf8');
  const navigation = readFileSync(navigationPath, 'utf8');

  assert.match(panel, /Product-category estimate accuracy/);
  assert.match(panel, /Rows are grouped by service, product category, and item rather than by tender/);
  assert.match(panel, /Manual offset/);
  assert.match(panel, /Automatic offset/);
  assert.match(navigation, /Pricing Intelligence/);
});
