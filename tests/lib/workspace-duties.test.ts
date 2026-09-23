import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ADDITIONAL_BUYER_DUTIES, canMakeSupplierPayment, hasBuyerDuty, PRIMARY_BUYER_DUTIES, serialiseBuyerDuties } from '../../src/lib/workspace-duties';

test('primary buyer duties include accept-and-pay; additional users do not', () => {
  assert.equal(hasBuyerDuty(PRIMARY_BUYER_DUTIES, 'APPROVER'), true);
  assert.equal(hasBuyerDuty(ADDITIONAL_BUYER_DUTIES, 'APPROVER'), false);
  assert.equal(hasBuyerDuty(ADDITIONAL_BUYER_DUTIES, 'RAISER'), true);
});

test('PAYMENTS is the supplier permission the payment path reads', () => {
  assert.equal(canMakeSupplierPayment('VIEW,EDIT'), false);
  assert.equal(canMakeSupplierPayment('VIEW,PAYMENTS'), true);
  assert.equal(serialiseBuyerDuties(['RAISER', 'APPROVER', 'unknown']), 'RAISER,APPROVER');
});

test('createPayment and acceptQuote enforce spend roles', () => {
  const payments = readFileSync('src/server/payments/paymentService.ts', 'utf8');
  const accept = readFileSync('src/server/domain/contactReleaseService.ts', 'utf8');
  const createTender = readFileSync('src/app/api/tenders/route.ts', 'utf8');
  assert.match(payments, /assertBuyerDuty\(params\.userId, 'APPROVER'\)/);
  assert.match(payments, /assertSupplierPaymentPermission/);
  assert.match(accept, /assertBuyerDuty\(clientId, 'APPROVER'\)/);
  assert.match(accept, /userOwnsTender/);
  assert.match(createTender, /assertBuyerDuty\(user\.id, 'RAISER'\)/);
});
