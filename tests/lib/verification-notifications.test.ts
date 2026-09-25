import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  enhancedVerificationInvitationTemplate,
  independentReviewDecisionTemplate,
  providerAutomatedVerificationTemplate,
} from '../../src/server/notifications/emailTemplates';

const previousAppUrl = process.env.NEXTAUTH_URL;
process.env.NEXTAUTH_URL = 'https://tender.example.test';
test.after(() => {
  if (previousAppUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = previousAppUrl;
});

test('automated verification emails describe a PDF text check and omit the assessment report', () => {
  const passed = providerAutomatedVerificationTemplate({ passed: true, confidencePercent: 95 });
  assert.match(passed.subject, /passed/i);
  assert.match(passed.html, /PDF text check/);
  assert.match(passed.html, /not a Companies House, HMRC, or insurer lookup/);
  assert.match(passed.html, /does not confirm insurance/);

  const failed = providerAutomatedVerificationTemplate({ passed: false, confidencePercent: 40 });
  assert.match(failed.subject, /did not pass/i);
  assert.match(failed.html, /not attached/);
  assert.doesNotMatch(failed.html, /human reviewer/);
});

test('enhanced decision emails omit reviewer notes and do not name Sinclair Safety as the auditor', () => {
  const awarded = independentReviewDecisionTemplate({ approved: true, tier: 'GOLD' });
  assert.match(awarded.subject, /Gold/);
  assert.match(awarded.html, /professional review was recorded/);
  assert.doesNotMatch(awarded.html, /Sinclair Safety/);

  const declined = independentReviewDecisionTemplate({ approved: false, tier: 'BRONZE' });
  assert.match(declined.subject, /not approved/i);
  assert.doesNotMatch(declined.html, /nominated/);
});

test('enhanced invitation copy is a self-purchase onboarding link, not a nomination to register on Trade Tender', () => {
  const template = enhancedVerificationInvitationTemplate({
    recipientName: 'Alex',
    inviteLink: 'https://hsqe.example.test/onboard?token=abc',
    expiresAt: new Date('2027-01-01T12:00:00.000Z'),
  });
  assert.match(template.subject, /HSQE Consult Hub/);
  assert.match(template.html, /confirmed enhanced verification purchase/);
  assert.doesNotMatch(template.html, /nominated/);
  assert.doesNotMatch(template.html, /\/register\?/);
});

test('verification submit and enhanced decision routes send outcome email', () => {
  const verificationRoute = readFileSync('src/app/api/retailer/verification/route.ts', 'utf8');
  const superUserRoute = readFileSync('src/app/api/super-user/users/[id]/route.ts', 'utf8');
  assert.match(verificationRoute, /providerAutomatedVerificationTemplate/);
  assert.match(verificationRoute, /sendTransactionalEmail/);
  assert.match(superUserRoute, /notifyIndependentReviewDecision/);
});
