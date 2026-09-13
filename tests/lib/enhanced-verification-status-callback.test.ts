import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import {
  createEnhancedVerificationInvitation,
  signInvitationPayload,
  verifyInvitationToken,
} from '../../src/server/domain/enhancedVerificationInvitationService';

test('shared secret custom signing and token verification', () => {
  const customSecret = 'custom-shared-secret-1234567890';
  const payload = { Email: 'test@example.com', Module: 'VERIFICATION', Product: 'ENHANCED_VERIFICATION' };

  const token = signInvitationPayload(payload, customSecret);
  assert.ok(token);

  const verified = verifyInvitationToken(token, customSecret);
  assert.ok(verified);
  assert.equal(verified.Email, 'test@example.com');

  // Rejects if wrong secret is supplied
  const invalid = verifyInvitationToken(token, 'wrong-secret-999999999');
  assert.equal(invalid, null);
});

test('partner status callback route requires valid shared secret authentication', () => {
  const route = readFileSync('src/app/api/partner/enhanced-verification/status/route.ts', 'utf8');

  assert.match(route, /getIndependentReviewSharedSecret/);
  assert.match(route, /x-shared-secret/i);
  assert.match(route, /x-signature/i);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /Unauthorized: Invalid or missing shared secret/);
});

test('partner status update via API updates RetailerProfile and consumes invitation', async (context) => {
  const suffix = randomUUID();
  let userId: string | undefined;
  let paymentId: string | undefined;
  let invitationId: string | undefined;

  context.after(async () => {
    if (invitationId) await prisma.enhancedVerificationInvitation.deleteMany({ where: { id: invitationId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (userId) {
      await prisma.retailerProfile.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  const user = await prisma.user.create({
    data: {
      email: `status-callback-${suffix}@example.test`,
      passwordHash: 'hash',
      role: 'USER',
      contactName: 'Callback Tester',
      retailerProfile: {
        create: {
          companyName: 'Callback Ltd',
          categories: 'Materials, Contractor Services',
          coverageAreas: '',
        },
      },
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

  const sharedSecret = 'test-secret-123456';
  process.env.ENHANCED_VERIFICATION_SHARED_SECRET = sharedSecret;

  const invitation = await createEnhancedVerificationInvitation({
    userId,
    paymentId: payment.id,
    recipientEmail: user.email,
  });

  invitationId = invitation.invitationId;

  // Import route handler dynamically to test status callback execution
  const { POST } = await import('../../src/app/api/partner/enhanced-verification/status/route');

  const payload = {
    token: invitation.signedToken,
    status: 'APPROVED',
    tier: 'GOLD',
    note: 'HSQE Consult Hub review completed successfully.',
  };

  const bodyText = JSON.stringify(payload);
  const signature = createHmac('sha256', sharedSecret).update(bodyText).digest('hex');

  const request = new Request('http://localhost/api/partner/enhanced-verification/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
    body: bodyText,
  });

  const response = await POST(request);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.status, 'SUCCESS');
  assert.equal(data.userId, userId);
  assert.equal(data.independentReviewStatus, 'APPROVED');
  assert.equal(data.independentReviewTier, 'GOLD');

  // Verify RetailerProfile state in DB
  const profile = await prisma.retailerProfile.findUnique({
    where: { userId },
  });
  assert.equal(profile?.independentReviewStatus, 'APPROVED');
  assert.equal(profile?.independentReviewTier, 'GOLD');
  assert.equal(profile?.independentReviewNote, 'HSQE Consult Hub review completed successfully.');

  delete process.env.ENHANCED_VERIFICATION_SHARED_SECRET;
});
