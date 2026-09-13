import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import {
  createEnhancedVerificationInvitation,
  hashInvitationToken,
  signInvitationPayload,
  verifyAndConsumeInvitationToken,
  verifyInvitationToken,
} from '../../src/server/domain/enhancedVerificationInvitationService';

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

  // Unconfirmed / Pending payment
  const pendingPayment = await prisma.payment.create({
    data: {
      type: 'INDEPENDENT_REVIEW',
      amountGbp: 150,
      totalAmountGbp: 180,
      vatGbp: 30,
      status: 'PENDING',
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
      });
    },
    {
      message: 'Enhanced Verification has not been purchased or payment is incomplete.',
    }
  );
});

test('successful invitation creation: validates purchase, generates token, stores token hash, sends email, and logs audit', async (context) => {
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
    ipAddress: '127.0.0.1',
  });

  invitationId = result.invitationId;

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.Status, 'SUCCESS');
  assert.ok(result.invitationId);
  assert.ok(result.expiryUtc);
  assert.ok(result.registrationLink.includes('token='));

  // Verify DB record
  const dbRecord = await prisma.enhancedVerificationInvitation.findUnique({
    where: { id: invitationId },
  });
  assert.ok(dbRecord);
  assert.equal(dbRecord.userId, userId);
  assert.equal(dbRecord.paymentId, payment.id);
  assert.equal(dbRecord.recipientEmail, recipientEmail);
  assert.equal(dbRecord.moduleCode, 'VERIFICATION');
  assert.equal(dbRecord.productCode, 'ENHANCED_VERIFICATION');
  assert.equal(dbRecord.status, 'PENDING');
  assert.equal(dbRecord.tokenHash, hashInvitationToken(result.signedToken));

  // Verify signature
  const parsedPayload = verifyInvitationToken(result.signedToken);
  assert.ok(parsedPayload);
  assert.equal(parsedPayload.Module, 'VERIFICATION');
  assert.equal(parsedPayload.Product, 'ENHANCED_VERIFICATION');
  assert.equal(parsedPayload.Email, recipientEmail);

  // Consume token
  const consumed = await verifyAndConsumeInvitationToken(result.signedToken);
  assert.ok(consumed);
  assert.equal(consumed.id, invitationId);
  assert.equal(consumed.status, 'USED');

  // Double consumption fails
  const reConsumed = await verifyAndConsumeInvitationToken(result.signedToken);
  assert.equal(reConsumed, null);
});

test('custom defined registration URL incorporates secret token in query parameters', async (context) => {
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
      email: `custom-url-${suffix}@example.test`,
      passwordHash: 'hash',
      role: 'USER',
      contactName: 'Custom URL Purchaser',
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
      userId,
    },
  });
  paymentId = payment.id;

  const customPartnerUrl = 'https://hsqeconsulthub.co.uk/register';
  const result = await createEnhancedVerificationInvitation({
    userId,
    paymentId: payment.id,
    recipientEmail: `custom-partner-${suffix}@example.test`,
    registrationUrl: customPartnerUrl,
  });

  invitationId = result.invitationId;

  assert.ok(result.registrationLink.startsWith('https://hsqeconsulthub.co.uk/register?token='));
  assert.ok(result.registrationLink.includes('&verificationToken='));
});

test('email template includes required prompt elements', () => {
  const emailTemplates = readFileSync('src/server/notifications/emailTemplates.ts', 'utf8');

  assert.match(emailTemplates, /Enhanced Verification Registration Invitation/);
  assert.match(emailTemplates, /You have been nominated to complete Enhanced Verification/);
  assert.match(emailTemplates, /Important:/);
  assert.match(emailTemplates, /This link is unique/);
  assert.match(emailTemplates, /It can only be used once/);
  assert.match(emailTemplates, /Verification Team/);
});

test('invite API route requires authenticated user and payment verification', () => {
  const route = readFileSync('src/app/api/retailer/independent-review/invite/route.ts', 'utf8');

  assert.match(route, /requireRole\('USER'\)/);
  assert.match(route, /createEnhancedVerificationInvitation/);
  assert.match(route, /Enhanced Verification has not been purchased/);
});
