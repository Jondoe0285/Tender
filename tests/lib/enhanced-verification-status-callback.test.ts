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
  const payload = { Email: 'test@example.com', Module: 'VERIFICATION', Product: 'ENHANCED_VERIFICATION_GOLD' };

  const token = signInvitationPayload(payload, customSecret);
  assert.ok(token);

  const verified = verifyInvitationToken(token, customSecret);
  assert.ok(verified);
  assert.equal(verified.Email, 'test@example.com');

  const invalid = verifyInvitationToken(token, 'wrong-secret-999999999');
  assert.equal(invalid, null);
});

test('partner status callback route requires valid shared secret authentication and binds to invitation payment', () => {
  const route = readFileSync('src/app/api/partner/enhanced-verification/status/route.ts', 'utf8');

  assert.match(route, /getIndependentReviewSharedSecret/);
  assert.match(route, /x-shared-secret/i);
  assert.match(route, /x-signature/i);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /Unauthorized: Invalid or missing shared secret/);
  assert.match(route, /Awarded tier cannot exceed the purchased verification product/);
  assert.doesNotMatch(route, /rawEmail/);
  assert.doesNotMatch(route, /providerUserId/);
});

async function seedPurchasedProvider(tier: 'BRONZE' | 'SILVER' | 'GOLD') {
  const suffix = randomUUID();
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
  const payment = await prisma.payment.create({
    data: {
      type: 'INDEPENDENT_REVIEW',
      amountGbp: 150,
      totalAmountGbp: 180,
      vatGbp: 30,
      status: 'CONFIRMED',
      independentReviewTier: tier,
      userId: user.id,
    },
  });
  const invitation = await createEnhancedVerificationInvitation({
    userId: user.id,
    paymentId: payment.id,
    recipientEmail: user.email,
    purchasedTier: tier,
  });
  return { user, payment, invitation, suffix };
}

test('partner status update via API awards a tier at or below the purchased product', async (context) => {
  const sharedSecret = 'test-secret-123456';
  process.env.ENHANCED_VERIFICATION_SHARED_SECRET = sharedSecret;
  const { user, payment, invitation } = await seedPurchasedProvider('GOLD');
  context.after(async () => {
    await prisma.enhancedVerificationInvitation.deleteMany({ where: { id: invitation.invitationId } });
    await prisma.payment.deleteMany({ where: { id: payment.id } });
    await prisma.retailerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    delete process.env.ENHANCED_VERIFICATION_SHARED_SECRET;
  });

  const { POST } = await import('../../src/app/api/partner/enhanced-verification/status/route');
  const payload = {
    token: invitation.signedToken,
    status: 'APPROVED',
    tier: 'SILVER',
    note: 'HSQE Consult Hub review completed successfully.',
  };
  const bodyText = JSON.stringify(payload);
  const signature = createHmac('sha256', sharedSecret).update(bodyText).digest('hex');
  const response = await POST(new Request('http://localhost/api/partner/enhanced-verification/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: bodyText,
  }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.independentReviewTier, 'SILVER');
  const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
  assert.equal(profile?.independentReviewStatus, 'APPROVED');
  assert.equal(profile?.independentReviewTier, 'SILVER');
  assert.equal(profile?.independentReviewPurchasedTier, 'GOLD');
});

test('partner status callback rejects an awarded tier above the purchased product', async (context) => {
  const sharedSecret = 'test-secret-123456';
  process.env.ENHANCED_VERIFICATION_SHARED_SECRET = sharedSecret;
  const { user, payment, invitation } = await seedPurchasedProvider('BRONZE');
  context.after(async () => {
    await prisma.enhancedVerificationInvitation.deleteMany({ where: { id: invitation.invitationId } });
    await prisma.payment.deleteMany({ where: { id: payment.id } });
    await prisma.retailerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    delete process.env.ENHANCED_VERIFICATION_SHARED_SECRET;
  });

  const { POST } = await import('../../src/app/api/partner/enhanced-verification/status/route');
  const payload = { invitationId: invitation.invitationId, status: 'APPROVED', tier: 'GOLD' };
  const bodyText = JSON.stringify(payload);
  const signature = createHmac('sha256', sharedSecret).update(bodyText).digest('hex');
  const response = await POST(new Request('http://localhost/api/partner/enhanced-verification/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: bodyText,
  }));
  assert.equal(response.status, 400);
  const profile = await prisma.retailerProfile.findUnique({ where: { userId: user.id } });
  assert.notEqual(profile?.independentReviewStatus, 'APPROVED');
});

test('partner status callback rejects unbound email identifiers', async () => {
  const route = readFileSync('src/app/api/partner/enhanced-verification/status/route.ts', 'utf8');
  assert.doesNotMatch(route, /findUnique\(\{\s*where: \{ email: rawEmail \}/);
});
