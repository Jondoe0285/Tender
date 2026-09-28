#!/usr/bin/env -S npx tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EmailTemplate } from '@/server/notifications/emailTemplates';
import {
  accountCreatedByAdminTemplate,
  accountUpdateTemplate,
  configurationTestTemplate,
  contactReleaseTemplate,
  contentHeldNotificationTemplate,
  contentReviewOutcomeTemplate,
  emailVerificationTemplate,
  enhancedVerificationInvitationTemplate,
  tradeTenderMarketingTemplate,
  tradeTenderSupplierMarketingTemplate,
  failedPaymentTemplate,
  newRegistrationTemplate,
  passwordResetTemplate,
  paymentConfirmationTemplate,
  paymentReversedTemplate,
  providerAutomatedVerificationTemplate,
  independentReviewDecisionTemplate,
  quoteAcceptedTemplate,
  quoteReceivedTemplate,
  supportRequestInformationTemplate,
  supportRequestNotificationTemplate,
  tenderFlaggedForReviewTemplate,
  tenderWarningEscalationTemplate,
} from '@/server/notifications/emailTemplates';
import { sendTransactionalEmail } from '@/server/notifications/resend';

type Audience = 'owner' | 'consultant' | 'client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const previewLink = 'https://preview.trade-tender.example/test-link';
const previewDate = new Date('2026-09-17T09:00:00.000Z');
const tenderReference = 'TND-TEST-000001';
const quoteReference = `${tenderReference}-Q01`;

function isEmail(value: string | undefined): value is string {
  return Boolean(value && EMAIL_PATTERN.test(value));
}

function tagged(audience: Audience, trigger: string, template: EmailTemplate): EmailTemplate {
  return {
    subject: `[SIMULATION][${audience}] ${template.subject}`,
    html: `<p style="margin:0 0 16px;font:12px/1.4 Arial,sans-serif;color:#1D3D5C">Simulated trigger: <strong>${trigger}</strong> · audience: <strong>${audience}</strong></p>${template.html}`,
  };
}

const catalog: Record<Audience, Array<[string, EmailTemplate]>> = {
  owner: [
    ['new-registration-notification', newRegistrationTemplate({ role: 'USER', email: 'client@example.test', contactName: 'Preview Client', companyName: 'Preview Construction Ltd' })],
    ['provider-automated-verification-passed', providerAutomatedVerificationTemplate({ passed: true, confidencePercent: 95 })],
    ['provider-automated-verification-failed', providerAutomatedVerificationTemplate({ passed: false, confidencePercent: 40 })],
    ['enhanced-verification-awarded', independentReviewDecisionTemplate({ approved: true, tier: 'SILVER' })],
    ['enhanced-verification-declined', independentReviewDecisionTemplate({ approved: false, tier: 'BRONZE' })],
    ['tender-warning-escalation', tenderWarningEscalationTemplate({ activeWarningCount: 3, reviewPath: '/super-user/users/preview-client' })],
    ['support-request-notification', supportRequestNotificationTemplate({ type: 'CHANGE', submittedAt: previewDate })],
    ['configuration-test', configurationTestTemplate({ environment: 'email-trigger-simulation', sentAt: previewDate })],
    ['trade-tender-marketing', tradeTenderMarketingTemplate({ unsubscribeUrl: `${previewLink}/unsubscribe`, ctaUrl: `${previewLink}/register` })],
    ['trade-tender-supplier-marketing', tradeTenderSupplierMarketingTemplate({ unsubscribeUrl: `${previewLink}/unsubscribe`, ctaUrl: `${previewLink}/register?intent=supplying` })],
  ],
  consultant: [
    ['enhanced-verification-invitation', enhancedVerificationInvitationTemplate({ recipientName: 'Preview Consultant', inviteLink: previewLink, expiresAt: previewDate })],
  ],
  client: [
    ['email-verification', emailVerificationTemplate({ verificationLink: previewLink })],
    ['password-reset', passwordResetTemplate({ resetLink: previewLink, expiresIn: '24 hours' })],
    ['admin-created-account', accountCreatedByAdminTemplate({ role: 'USER', contactName: 'Preview Client', companyName: 'Preview Construction Ltd', resetLink: previewLink, expiresIn: '24 hours' })],
    ['quote-received', quoteReceivedTemplate({ tenderReference, quoteReference, category: 'Construction materials', priceGbp: 1250, leadTimeDays: 5, reviewPath: '/client/tenders/preview-tender' })],
    ['quote-accepted', quoteAcceptedTemplate({ tenderReference, quoteReference, feeGbp: 10, paymentPath: '/client/quotes/preview-quote' })],
    ['contact-release', contactReleaseTemplate({ tenderReference, quoteReference, recipientRole: 'CONTRACTOR', workspacePath: '/client/quotes/preview-quote' })],
    ['payment-confirmation', paymentConfirmationTemplate({ paymentType: 'Accepted quote release fee', amountGbp: 10, vatGbp: 2, totalAmountGbp: 12, reference: quoteReference, accountPath: '/client/billing' })],
    ['failed-payment', failedPaymentTemplate({ paymentType: 'Accepted quote release fee', amountGbp: 10, vatGbp: 2, totalAmountGbp: 12, reference: quoteReference, retryPath: '/client/billing' })],
    ['payment-reversed', paymentReversedTemplate({ paymentType: 'Accepted quote release fee', reference: quoteReference, reversalType: 'REFUND', accountPath: '/client/billing' })],
    ['tender-flagged-for-review', tenderFlaggedForReviewTemplate({ reference: tenderReference })],
    ['tender-warning-issued', accountUpdateTemplate({ title: 'Tender warning issued', summary: 'A Trade Tender warning relating to one of your tenders is available in your authenticated profile.', accountPath: '/client/profile' })],
    ['content-held', contentHeldNotificationTemplate({ contentLabel: 'tender description', reasons: ['Potential personal data'], accountPath: '/client/profile' })],
    ['content-review-outcome', contentReviewOutcomeTemplate({ contentLabel: 'tender description', releasedSafe: true, credits: 1, creditType: 'release credits', reviewNote: 'Released after review.', accountPath: '/client/profile' })],
    ['support-information-request', supportRequestInformationTemplate({ title: 'Quote release question', question: 'Please confirm the tender reference this relates to.', requestPath: '/client/support' })],
  ],
};

const args = process.argv.slice(2).filter((arg) => arg !== '--send');
const send = process.argv.includes('--send');
const [ownerArg, consultantArg, clientArg] = args;

const recipients: Record<Audience, string | undefined> = {
  owner: ownerArg || process.env.PLATFORM_OWNER_EMAIL || process.env.REGISTRATION_NOTIFICATION_EMAIL,
  consultant: consultantArg || process.env.CONSULTANT_EMAIL || process.env.ENHANCED_VERIFICATION_CONSULTANT_EMAIL,
  client: clientArg || process.env.CLIENT_EMAIL,
};

const outputDir = join(tmpdir(), 'trade-tender-email-simulations');
mkdirSync(outputDir, { recursive: true });

async function simulate() {
  const deliveries: string[] = [];
  for (const audience of ['owner', 'consultant', 'client'] as const) {
    for (const [trigger, template] of catalog[audience]) {
      const email = tagged(audience, trigger, template);
      const file = join(outputDir, `${audience}-${trigger}.html`);
      writeFileSync(file, `<!doctype html><title>${email.subject}</title>${email.html}`);
      const recipient = recipients[audience];
      if (send) {
        if (!isEmail(recipient)) {
          throw new Error(`${audience}: provide a real email as argv or env (got ${recipient ?? 'unset'})`);
        }
        const result = await sendTransactionalEmail(recipient, email);
        if (!result.sent) throw new Error(`${audience}/${trigger}: ${result.reason}`);
        deliveries.push(`${audience}/${trigger} -> ${recipient} (${result.id ?? 'accepted'})`);
      } else {
        deliveries.push(`${audience}/${trigger} -> ${file}`);
      }
      console.log(deliveries.at(-1));
    }
  }
  console.log(send
    ? `Delivered ${deliveries.length} simulated email triggers.`
    : `Wrote ${deliveries.length} simulated email triggers to ${outputDir}. Re-run with --send and three recipient emails to deliver via Resend.`);
}

void simulate().catch((error: unknown) => {
  console.error(`EMAIL TRIGGER SIMULATION FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
