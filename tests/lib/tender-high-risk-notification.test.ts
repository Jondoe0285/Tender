import assert from 'node:assert/strict';
import test from 'node:test';
import { tenderFlaggedForReviewTemplate } from '../../src/server/notifications/emailTemplates';

test('high-risk tender notification tells the owner a review is required without exposing risk details', () => {
  const previousAppUrl = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = 'https://tender.example.test';
  try {
    const template = tenderFlaggedForReviewTemplate({ reference: 'TND-20260906-000001' });

    assert.match(template.subject, /flagged for review/i);
    assert.match(template.html, /requires a Trade Tender review/i);
    assert.doesNotMatch(template.html, /duplicate|confidentiality|bypass/i);
  } finally {
    if (previousAppUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previousAppUrl;
  }
});