#!/usr/bin/env -S npx tsx
/** Sends a short operational notice through the single existing Resend integration. */
import { writeFileSync } from 'node:fs';
import { sendHealthReportEmail } from '../../src/server/notifications/resend';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string));
}

const [subject, body] = process.argv.slice(2);
if (!subject || !body) {
  console.error('Usage: send-workflow-email.ts "<subject>" "<body>"');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0D1B2A">
<h1 style="font-size:18px">${escapeHtml(subject)}</h1>
<pre style="font-size:14px;white-space:pre-wrap">${escapeHtml(body)}</pre>
<p style="color:#6B7280;font-size:12px">Trade Tender repository health-check system. This message does not authorise a deployment.</p>
</body></html>`;

void sendHealthReportEmail({ subject: `Trade Tender repository health check - ${subject} - ${date}`, html, text: body })
  .then((result) => {
    if (!result.sent) {
      console.error(`EMAIL DELIVERY FAILED: ${result.reason}`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## ❌ EMAIL DELIVERY FAILED\n\n${result.reason}\n`, { flag: 'a' });
      }
      process.exit(1);
    }
    console.log('Notification delivered.');
  })
  .catch((error: unknown) => {
    console.error(`EMAIL DELIVERY FAILED: ${error instanceof Error ? error.message : 'Unknown Resend error'}`);
    process.exit(1);
  });
