import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getIndependentReviewExpiryDate,
  getIndependentReviewRenewalOpenDate,
  independentReviewExpired,
  independentReviewRenewalAvailable,
} from '../../src/server/domain/independentReviewService';

test('independent review renewal opens after 11 months and expires after 12 months', () => {
  const approvedAt = new Date('2026-01-15T10:00:00.000Z');

  assert.equal(getIndependentReviewRenewalOpenDate(approvedAt)?.toISOString(), '2026-12-15T10:00:00.000Z');
  assert.equal(getIndependentReviewExpiryDate(approvedAt)?.toISOString(), '2027-01-15T10:00:00.000Z');
  assert.equal(independentReviewRenewalAvailable('APPROVED', approvedAt, new Date('2026-12-14T23:59:59.000Z')), false);
  assert.equal(independentReviewRenewalAvailable('APPROVED', approvedAt, new Date('2026-12-15T10:00:00.000Z')), true);
  assert.equal(independentReviewRenewalAvailable('APPROVED', approvedAt, new Date('2027-01-15T10:00:00.000Z')), false);
  assert.equal(independentReviewExpired('APPROVED', approvedAt, new Date('2027-01-15T10:00:00.000Z')), true);
});

test('independent review renewal is only available for approved reviews', () => {
  const approvedAt = new Date('2026-01-15T10:00:00.000Z');

  assert.equal(independentReviewRenewalAvailable('PURCHASED', approvedAt, new Date('2026-12-20T10:00:00.000Z')), false);
  assert.equal(independentReviewExpired('DECLINED', approvedAt, new Date('2027-02-01T10:00:00.000Z')), false);
});

test('independent review renewal is owner controlled and visible to eligible providers', () => {
  const settings = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const ownerPanel = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');
  const providerPage = readFileSync('src/app/retailer/independent-review/page.tsx', 'utf8');
  const apiRoute = readFileSync('src/app/api/retailer/independent-review/route.ts', 'utf8');

  assert.match(settings, /INDEPENDENT_REVIEW_RENEWAL_ACTIVE: 'false'/);
  assert.match(settings, /INDEPENDENT_REVIEW_RENEWAL_FEE_GBP: '100'/);
  assert.match(ownerPanel, /Enhanced review renewal/);
  assert.match(providerPage, /Renew now/);
  assert.match(apiRoute, /mode.*RENEWAL/);
});