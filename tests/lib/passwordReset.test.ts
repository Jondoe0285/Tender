import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { passwordResetRequestSchema } from '../../src/lib/schemas/passwordReset';
import { hashResetToken } from '../../src/server/auth/passwordReset';
import { accountCreatedByAdminTemplate, passwordResetTemplate } from '../../src/server/notifications/emailTemplates';

test('hashes reset tokens without retaining the raw token', () => {
  const token = 'a-raw-reset-token';
  const hashed = hashResetToken(token);

  assert.equal(hashed, createHash('sha256').update(token).digest('hex'));
  assert.ok(!hashed.includes(token));
});

test('produces a different hash for every token', () => {
  assert.notEqual(hashResetToken('token-one'), hashResetToken('token-two'));
});

test('invites an admin-created account without embedding a password', () => {
  const template = accountCreatedByAdminTemplate({
    role: 'RETAILER',
    contactName: 'Sam Mason',
    companyName: 'Mason Groundworks',
    resetLink: 'https://app.example/reset-password?token=abc123',
    expiresIn: '24 hours',
  });

  assert.match(template.subject, /account is ready/i);
  assert.ok(template.html.includes('https://app.example/reset-password?token=abc123'));
  assert.ok(template.html.includes('Mason Groundworks'));
  assert.ok(template.html.includes('No password is included in this message.'));
  assert.ok(template.html.includes('24 hours'));
});

test('escapes account details rendered into the invitation', () => {
  const template = accountCreatedByAdminTemplate({
    role: 'CLIENT',
    contactName: '<script>alert(1)</script>',
    resetLink: 'https://app.example/reset-password?token=abc',
    expiresIn: '24 hours',
  });

  assert.ok(!template.html.includes('<script>'));
  assert.ok(template.html.includes('&lt;script&gt;'));
});

test('builds a forgotten-password reset email without embedding account secrets', () => {
  const template = passwordResetTemplate({
    resetLink: 'https://app.example/reset-password?token=abc123',
    expiresIn: '24 hours',
  });

  assert.equal(template.subject, 'Reset your Trade Tender password');
  assert.ok(template.html.includes('https://app.example/reset-password?token=abc123'));
  assert.ok(template.html.includes('24 hours'));
  assert.ok(!template.html.includes('passwordHash'));
});

test('normalises forgotten-password request email input', () => {
  const parsed = passwordResetRequestSchema.parse({ email: '  USER@Example.TEST  ' });

  assert.equal(parsed.email, 'user@example.test');
  assert.equal(passwordResetRequestSchema.safeParse({ email: 'not-an-email' }).success, false);
});
