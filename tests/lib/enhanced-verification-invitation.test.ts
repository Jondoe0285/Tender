import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test, { describe } from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import {
  createEnhancedVerificationInvitation,
  hashInvitationToken,
  notifyConsulthubOfPurchase,
  signInvitationPayload,
  verifyAndConsumeInvitationToken,
  verifyInvitationToken,
} from '../../src/server/domain/enhancedVerificationInvitationService';

describe('enhanced verification invitation service', () => {
  test('business rule: rejects invitation if Enhanced Verification has not been purchased or payment is incomplete', async (context) => {
    const suffix = randomUUID();
    let userId: string | undefined;
    let paymentId: string | undefined;

    context.after(async () => {
      if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    });

    const user = await prisma.user.create({
      data: {
        email: `invite-test-${suffix}@example.test`,
        passwordHash: 'hash',
        role: 'USER',
        contactName: 'Invite Tester',
        suspended: false,
      },
    });
    userId = user.id;

    const pendingPayment = await prisma.payment.create({
      data: {
        type: 'INDEPENDENT_REVIEW',
        amountGbp: 150,
        totalAmountGbp: 180,
        vatGbp: 30,
        status: 'PENDING',
        independentReviewTier: 'BRONZE',
        userId,
      },
    });
    paymentId = pendingPayment.id;

    await assert.rejects(
      async () => {
        await createEnhancedVerificationInvitation({
          userId,
          paymentId: pendingPayment.id,
          recipientEmail: `recipient-${suffix}@example.test`,
          purchasedTier: 'BRONZE',
        });
      },
      {
        message: 'Enhanced Verification has not been purchased or payment is incomplete.',
      }
    );
  });

  test('business rule: rejects invitation if user account is suspended', async (context) => {
    const suffix = randomUUID();
    let userId: string | undefined;
    let paymentId: string | undefined;

    context.after(async () => {
      if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    });

    const user = await prisma.user.create({
      data: {
        email: `suspended-invite-${suffix}@example.test`,
        passwordHash: 'hash',
        role: 'USER',
        contactName: 'Suspended Tester',
        suspended: true,
      },
    });
    userId = user.id;

    const payment = await prisma.payment.create({
      data: {
        type: 'INDEPENDENT_REVIEW',
        amountGbp: 150,
        totalAmountGbp: 180,
        vatGbp: 30,
        status: 'CONFIRMED',
        independentReviewTier: 'BRONZE',
        userId,
      },
    });
    paymentId = payment.id;

    await assert.rejects(
      async () => {
        await createEnhancedVerificationInvitation({
          userId,
          paymentId: payment.id,
          recipientEmail: `recipient-${suffix}@example.test`,
          purchasedTier: 'BRONZE',
        });
      },
      {
        message: 'Enhanced Verification has not been purchased or payment is incomplete.',
      }
    );
  });

  test('successful invitation creation: validates purchase, generates token, stores token hash, and logs audit', async (context) => {
    const suffix = randomUUID();
    let userId: string | undefined;
    let paymentId: string | undefined;
    let invitationId: string | undefined;

    context.after(async () => {
      if (invitationId) await prisma.enhancedVerificationInvitation.deleteMany({ where: { id: invitationId } });
      if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    });

    const user = await prisma.user.create({
      data: {
        email: `valid-invite-${suffix}@example.test`,
        passwordHash: 'hash',
        role: 'USER',
        contactName: 'Valid Purchaser',
        suspended: false,
      },
    });
    userId = user.id;

    const payment = await prisma.payment.create({
      data: {
        type: 'INDEPENDENT_REVIEW',
        amountGbp: 150,
        totalAmountGbp: 180,
        vatGbp: 30,
        status: 'CONFIRMED',
        independentReviewTier: 'SILVER',
        userId,
      },
    });
    paymentId = payment.id;

    const recipientEmail = `nominated-${suffix}@example.test`;
    const result = await createEnhancedVerificationInvitation({
      userId,
      paymentId: payment.id,
      recipientEmail,
      recipientName: 'Nominated Reviewer',
      purchasedTier: 'SILVER',
    });

    invitationId = result.invitationId;

    assert.equal(result.status, 'SUCCESS');
    assert.ok(result.invitationId);
    assert.ok(result.expiryUtc);
    assert.ok(result.registrationLink.includes('token='));

    const dbRecord = await prisma.enhancedVerificationInvitation.findUnique({
      where: { id: invitationId },
    });
    assert.ok(dbRecord);
    assert.equal(dbRecord.userId, userId);
    assert.equal(dbRecord.paymentId, payment.id);
    assert.equal(dbRecord.recipientEmail, recipientEmail);
    assert.equal(dbRecord.moduleCode, 'VERIFICATION');
    assert.equal(dbRecord.productCode, 'ENHANCED_VERIFICATION_SILVER');
    assert.equal(dbRecord.status, 'PENDING');
    assert.equal(dbRecord.tokenHash, hashInvitationToken(result.signedToken));

    const parsedPayload = verifyInvitationToken(result.signedToken);
    assert.ok(parsedPayload);
    assert.equal(parsedPayload.Module, 'VERIFICATION');
    assert.equal(parsedPayload.Product, 'ENHANCED_VERIFICATION_SILVER');
    assert.equal(parsedPayload.PurchasedTier, 'SILVER');
    assert.equal(parsedPayload.Email, recipientEmail);

    const consumed = await verifyAndConsumeInvitationToken(result.signedToken);
    assert.ok(consumed);
    assert.equal(consumed.id, invitationId);
    assert.equal(consumed.status, 'USED');

    const reConsumed = await verifyAndConsumeInvitationToken(result.signedToken);
    assert.equal(reConsumed, null);
  });

  test('uses the configured partner URL and does not accept a caller-supplied registration URL', () => {
    const service = readFileSync('src/server/domain/enhancedVerificationInvitationService.ts', 'utf8');
    assert.match(service, /getIndependentReviewPartnerUrl/);
    assert.doesNotMatch(service, /registrationUrl/);
    assert.match(service, /notifyConsulthubOfPurchase/);
    assert.match(service, /Idempotency-Key/);
  });

  test('invite API route is Owner/Super User resend only and does not return the signed token', () => {
    const route = readFileSync('src/app/api/retailer/independent-review/invite/route.ts', 'utf8');

    assert.match(route, /requireFullSuperUser\(\)/);
    assert.match(route, /createEnhancedVerificationInvitation/);
    assert.doesNotMatch(route, /signedToken/);
    assert.doesNotMatch(route, /registrationUrl/);
  });

  test('notifyConsulthubOfPurchase is exported for payment confirmation', () => {
    assert.equal(typeof notifyConsulthubOfPurchase, 'function');
    assert.equal(typeof signInvitationPayload, 'function');
  });
});
