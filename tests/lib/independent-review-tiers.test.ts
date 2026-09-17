import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  canPurchaseIndependentReviewTier,
  getIndependentReviewExpiryDate,
  independentReviewExpired,
  independentReviewPurchaseInFlight,
} from '../../src/server/domain/independentReviewService';
import { independentReviewTierAtMost } from '../../src/lib/independentReviewTiers';

test('enhanced verification still expires after 12 months', () => {
  const approvedAt = new Date('2026-01-15T10:00:00.000Z');
  assert.equal(getIndependentReviewExpiryDate(approvedAt)?.toISOString(), '2027-01-15T10:00:00.000Z');
  assert.equal(independentReviewExpired('APPROVED', approvedAt, new Date('2027-01-14T10:00:00.000Z')), false);
  assert.equal(independentReviewExpired('APPROVED', approvedAt, new Date('2027-01-15T10:00:00.000Z')), true);
});

test('in-flight upgrade is detected when a newer purchase is awaiting a decision', () => {
  const decidedAt = new Date('2026-01-01T00:00:00.000Z');
  const purchasedAt = new Date('2026-06-01T00:00:00.000Z');
  assert.equal(independentReviewPurchaseInFlight({ status: 'APPROVED', awardedTier: 'BRONZE', purchasedAt, decidedAt }, new Date('2026-06-02T00:00:00.000Z')), true);
  assert.equal(independentReviewPurchaseInFlight({ status: 'APPROVED', awardedTier: 'BRONZE', purchasedAt: decidedAt, decidedAt }, new Date('2026-06-02T00:00:00.000Z')), false);
  assert.equal(independentReviewPurchaseInFlight({ status: 'PURCHASED', awardedTier: null, purchasedAt, decidedAt: null }), true);
});

test('providers can repurchase after expiry and upgrade to a higher tier while approved', () => {
  const decidedAt = new Date('2026-01-15T10:00:00.000Z');
  const approved = { status: 'APPROVED', awardedTier: 'BRONZE' as const, purchasedAt: decidedAt, decidedAt };
  assert.equal(canPurchaseIndependentReviewTier(approved, 'BRONZE', new Date('2026-06-01T00:00:00.000Z')).allowed, false);
  assert.equal(canPurchaseIndependentReviewTier(approved, 'SILVER', new Date('2026-06-01T00:00:00.000Z')).allowed, true);
  assert.equal(canPurchaseIndependentReviewTier(approved, 'GOLD', new Date('2026-06-01T00:00:00.000Z')).allowed, true);
  assert.equal(canPurchaseIndependentReviewTier(approved, 'GOLD', new Date('2027-01-15T10:00:00.000Z')).allowed, true);
  assert.equal(canPurchaseIndependentReviewTier({ status: 'PURCHASED', awardedTier: null, purchasedAt: decidedAt, decidedAt: null }, 'GOLD').reason, 'in_flight');
});

test('awarded tier cannot exceed the purchased product', () => {
  assert.equal(independentReviewTierAtMost('BRONZE', 'GOLD'), true);
  assert.equal(independentReviewTierAtMost('GOLD', 'BRONZE'), false);
  assert.equal(independentReviewTierAtMost('SILVER', 'SILVER'), true);
});

test('owner settings and purchase API expose three tier prices and no renewal SKU', () => {
  const settings = readFileSync('src/server/domain/platformSettings.ts', 'utf8');
  const apiRoute = readFileSync('src/app/api/retailer/independent-review/route.ts', 'utf8');
  const ownerPanel = readFileSync('src/components/admin/SuperUserSettingsPanel.tsx', 'utf8');
  const paymentService = readFileSync('src/server/payments/paymentService.ts', 'utf8');

  assert.match(settings, /INDEPENDENT_REVIEW_FEE_BRONZE_GBP/);
  assert.match(settings, /INDEPENDENT_REVIEW_FEE_SILVER_GBP/);
  assert.match(settings, /INDEPENDENT_REVIEW_FEE_GOLD_GBP/);
  assert.doesNotMatch(settings, /INDEPENDENT_REVIEW_RENEWAL_ACTIVE/);
  assert.doesNotMatch(settings, /INDEPENDENT_REVIEW_REASSESSMENT/);
  assert.match(apiRoute, /independentReviewTier/);
  assert.match(apiRoute, /purchasableTiers/);
  assert.doesNotMatch(apiRoute, /RENEWAL/);
  assert.match(ownerPanel, /Bronze verification/);
  assert.match(ownerPanel, /Silver verification/);
  assert.match(ownerPanel, /Gold verification/);
  assert.doesNotMatch(ownerPanel, /Enhanced review renewal/);
  assert.doesNotMatch(ownerPanel, /updated assessment/i);
  assert.doesNotMatch(ownerPanel, /Enhanced H&amp;S review/);
  assert.doesNotMatch(ownerPanel, /Enhanced verification products/);
  assert.doesNotMatch(ownerPanel, /Provider verification human review/);
  assert.match(paymentService, /Enhanced verification —/);
  assert.match(paymentService, /independentReviewTier: params.independentReviewTier/);
});

test('payment confirmation notifies Consulthub and refunds revoke enhanced verification', () => {
  const service = readFileSync('src/server/domain/independentReviewService.ts', 'utf8');
  const reversal = readFileSync('src/server/payments/paymentReversalService.ts', 'utf8');
  const secrets = readFileSync('src/server/domain/enhancedVerificationInvitationService.ts', 'utf8');

  assert.match(service, /notifyConsulthubOfPurchase/);
  assert.match(service, /revokeIndependentReviewForPayment/);
  assert.match(reversal, /revokeIndependentReviewForPayment/);
  assert.doesNotMatch(secrets, /NEXTAUTH_SECRET/);
  assert.doesNotMatch(secrets, /MOBILE_TOKEN_SECRET/);
});
