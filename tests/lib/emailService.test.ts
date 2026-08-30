import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmailConfigured } from '../../src/server/notifications/resend';
import { configurationTestTemplate } from '../../src/server/notifications/emailTemplates';

function withEnvironment(values: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('reports email as configured only when both the key and sender are set', () => {
  withEnvironment({ RESEND_API_KEY: 'test-key', EMAIL_FROM: 'Trade Tender <notifications@example.test>' }, () => {
    assert.equal(isEmailConfigured(), true);
  });
});

test('treats a missing sender as unconfigured rather than falling back to a default', () => {
  withEnvironment({ RESEND_API_KEY: 'test-key', EMAIL_FROM: undefined }, () => {
    assert.equal(isEmailConfigured(), false);
  });
});

test('treats a blank sender as unconfigured', () => {
  withEnvironment({ RESEND_API_KEY: 'test-key', EMAIL_FROM: '   ' }, () => {
    assert.equal(isEmailConfigured(), false);
  });
});

test('treats a missing api key as unconfigured', () => {
  withEnvironment({ RESEND_API_KEY: undefined, EMAIL_FROM: 'Trade Tender <notifications@example.test>' }, () => {
    assert.equal(isEmailConfigured(), false);
  });
});

test('names the environment in the delivery test and leaks no account data', () => {
  const sentAt = new Date('2026-08-30T12:00:00.000Z');
  const template = configurationTestTemplate({ environment: 'staging', sentAt });

  assert.match(template.subject, /staging/);
  assert.ok(template.html.includes('2026-08-30T12:00:00.000Z'));
  assert.ok(template.html.includes('No account, tender, quote, or contact information is included'));
});
