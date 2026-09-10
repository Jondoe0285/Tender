import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('pre-release notification email templates cannot accept the counterparty contact details as input', () => {
  const source = readFileSync('src/server/notifications/emailTemplates.ts', 'utf8');
  const preReleaseTemplates = ['tenderOpportunityTemplate', 'tenderUpdatedTemplate', 'quoteReceivedTemplate', 'quoteReminderTemplate', 'quoteAcceptedTemplate'];

  for (const templateName of preReleaseTemplates) {
    const match = source.match(new RegExp(`export function ${templateName}\\(input: \\{([^}]*)\\}`));
    assert.ok(match, `Could not find the ${templateName} signature`);
    const params = match![1]!;
    assert.doesNotMatch(params, /\bemail\b/i, `${templateName} must not accept an email address parameter`);
    assert.doesNotMatch(params, /\bcontactPhone\b|\bphone\b/i, `${templateName} must not accept a phone number parameter`);
  }
});
