import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPaymentDiscount } from '../../src/server/payments/paymentService';

test('membership discount applies to each additional unlock after credits are exhausted', () => {
  assert.equal(applyPaymentDiscount(10, 25), 7.5);
  assert.equal(applyPaymentDiscount(10, 0), 10);
  assert.equal(applyPaymentDiscount(10, 100), 0);
});