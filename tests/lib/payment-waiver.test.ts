import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { grantPaymentWaiverSchema, revokePaymentWaiverSchema } from '../../src/lib/schemas/paymentWaiver';

test('validates fee-scoped payment waiver grants and revocations', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal(grantPaymentWaiverSchema.safeParse({ userId: 'clx12345678901234567890123', feeType: 'RETAILER_UNLOCK', reason: 'Approved support remediation for this account.', expiresAt: future }).success, true);
  assert.equal(grantPaymentWaiverSchema.safeParse({ userId: 'clx12345678901234567890123', feeType: 'SPONSORED_PLACEMENT', reason: 'Approved support remediation for this account.' }).success, false);
  assert.equal(grantPaymentWaiverSchema.safeParse({ userId: 'clx12345678901234567890123', feeType: 'CLIENT_RELEASE', reason: 'Short' }).success, false);
  assert.equal(revokePaymentWaiverSchema.safeParse({ reason: 'No longer required after account remediation.' }).success, true);
  assert.equal(revokePaymentWaiverSchema.safeParse({ reason: 'Short' }).success, false);
});

test('requires Owner authorization and records immutable waiver use before entitlement', () => {
  const grantRoute = readFileSync('src/app/api/super-user/owner/payment-waivers/route.ts', 'utf8');
  const revokeRoute = readFileSync('src/app/api/super-user/owner/payment-waivers/[id]/route.ts', 'utf8');
  const service = readFileSync('src/server/domain/paymentWaiverService.ts', 'utf8');
  assert.match(grantRoute, /requireOwner\(\)/);
  assert.match(revokeRoute, /requireOwner\(\)/);
  assert.match(service, /amountGbp: 0, vatPercentage: 0, vatGbp: 0, totalAmountGbp: 0, status: 'CONFIRMED'/);
  assert.match(service, /paymentWaiverId: waiver\.id/);
  assert.match(service, /action: 'PAYMENT_WAIVER_GRANTED'/);
  assert.match(service, /action: 'PAYMENT_WAIVER_REVOKED'/);
  assert.match(service, /action: 'PAYMENT_WAIVER_USED'/);
});

test('consumes waivers in both payment-gated entitlement paths', () => {
  const unlock = readFileSync('src/server/domain/unlockService.ts', 'utf8');
  const release = readFileSync('src/server/domain/contactReleaseService.ts', 'utf8');
  assert.match(unlock, /consumePaymentWaiver\(\{ userId: retailerId, feeType: 'RETAILER_UNLOCK', tenderId \}\)/);
  assert.match(unlock, /method: 'WAIVED', paymentId: waiverUse\.payment\.id/);
  assert.match(release, /consumePaymentWaiver\(\{ userId: clientId, feeType: 'CLIENT_RELEASE', quoteId \}\)/);
  assert.match(release, /finalizeContactRelease\(clientId, quoteId, waiverUse\.payment\.id\)/);
});