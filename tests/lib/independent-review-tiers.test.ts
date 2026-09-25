import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('owner settings expose three verification prices and no old review SKUs', () => {
  const settings = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const ownerPanel = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');
  const tiers = readFileSync('src/lib/independentReviewTiers.ts', 'utf8');

  assert.match(settings, /INDEPENDENT_REVIEW_FEE_BRONZE_GBP/);
  assert.match(settings, /INDEPENDENT_REVIEW_FEE_SILVER_GBP/);
  assert.match(settings, /INDEPENDENT_REVIEW_FEE_GOLD_GBP/);
  assert.match(tiers, /BRONZE: 295/);
  assert.match(tiers, /SILVER: 495/);
  assert.match(tiers, /GOLD: 695/);
  assert.doesNotMatch(settings, /INDEPENDENT_REVIEW_RENEWAL_FEE_GBP:/);
  assert.doesNotMatch(settings, /INDEPENDENT_REVIEW_REASSESSMENT_FEE_GBP:/);
  assert.match(ownerPanel, /Bronze verification/);
  assert.match(ownerPanel, /Silver verification/);
  assert.match(ownerPanel, /Gold verification/);
  assert.doesNotMatch(ownerPanel, /Enhanced review renewal/);
  assert.doesNotMatch(ownerPanel, /updated assessment/i);
  assert.doesNotMatch(ownerPanel, /Enhanced H&amp;S review/);
  assert.doesNotMatch(ownerPanel, /Enhanced verification products/);
  assert.doesNotMatch(ownerPanel, /Provider verification human review/);
  assert.match(settings, /HUMAN_REVIEW_ACTIVE: 'false'/);
});
