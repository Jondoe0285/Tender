import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('independent review renewal reminder email includes expiry and renewal action', async () => {
  process.env.NEXTAUTH_URL = 'https://example.test';
  const { independentReviewRenewalReminderTemplate } = await import('../../src/server/notifications/emailTemplates');
  const template = independentReviewRenewalReminderTemplate({
    companyName: 'Example Contractor Ltd',
    expiryDate: new Date('2027-01-15T10:00:00.000Z'),
    renewalFeeGbp: 100,
    renewalPath: '/retailer/independent-review?renewal=1',
  });

  assert.match(template.subject, /renewal due soon/i);
  assert.match(template.html, /Example Contractor Ltd/);
  assert.match(template.html, /15 January 2027/);
  assert.match(template.html, /Renew now/);
  assert.match(template.html, /independent-review\?renewal=1/);
});

test('independent review renewal reminder workflow is scheduled and fail-closed', () => {
  const workflow = readFileSync('.github/workflows/independent-review-renewal-reminders.yml', 'utf8');
  const validator = readFileSync('scripts/health-check/validate-workflows.mjs', 'utf8');
  const script = readFileSync('scripts/send-independent-review-renewal-reminders.ts', 'utf8');
  const service = readFileSync('src/server/domain/independentReviewService.ts', 'utf8');

  assert.match(workflow, /cron: '23 8 \* \* \*'/);
  assert.match(workflow, /DATABASE_URL/);
  assert.match(workflow, /RESEND_API_KEY/);
  assert.match(workflow, /EMAIL_FROM/);
  assert.match(workflow, /NEXTAUTH_URL/);
  assert.match(validator, /independent-review-renewal-reminders\.yml/);
  assert.match(script, /sendIndependentReviewRenewalReminders/);
  assert.match(service, /INDEPENDENT_REVIEW_RENEWAL_REMINDER_SENT/);
  assert.match(service, /metadata: \{ contains: expiresAt\.toISOString\(\) \}/);
});
