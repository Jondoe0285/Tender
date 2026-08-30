#!/usr/bin/env -S npx tsx
/**
 * Sends the completed health report through the single existing Resend integration.
 * Reads the generated report only — it never receives repository write credentials.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { sendHealthReportEmail } from '../../src/server/notifications/resend';

type Summary = {
  status: string;
  release: string;
  counts: Record<string, number>;
  archiveMarkdown: string;
  failedChecks: string[];
};

type ReportJson = {
  status: string;
  release: string;
  context: Record<string, string>;
  counts: Record<string, number>;
  checks: Array<{ id: string; name: string; status: string }>;
  findings: Array<{ id: string; severity: string; title: string; lifecycle: string; actionable?: boolean }>;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string));
}

function main() {
  const summaryPath = 'docs/health-check/run-summary.json';
  const reportPath = 'docs/health-check/latest.json';
  if (!existsSync(summaryPath) || !existsSync(reportPath)) {
    console.error('EMAIL DELIVERY FAILED: the health report has not been generated.');
    process.exit(1);
  }

  const summary: Summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const report: ReportJson = JSON.parse(readFileSync(reportPath, 'utf8'));
  const context = report.context;
  const date = String(context.startedAt ?? new Date().toISOString()).slice(0, 10);

  const checkStatus = (id: string) => report.checks.find((check) => check.id === id)?.status ?? 'UNAVAILABLE';
  const open = report.findings.filter((finding) => finding.lifecycle !== 'Resolved');
  const critical = open.filter((finding) => finding.severity === 'CRITICAL');
  const high = open.filter((finding) => finding.severity === 'HIGH');
  const topThree = open.filter((finding) => finding.actionable !== false).slice(0, 3);

  const reportPrUrl = process.env.REPORT_PR_URL || 'Not created — see workflow artifacts.';
  const runUrl = context.runUrl ?? 'Not applicable.';

  const lines = [
    `Trade Tender repository health check`,
    ``,
    `Overall status: ${report.status}`,
    `Release recommendation: ${report.release}`,
    ``,
    `Repository: ${context.repository}`,
    `Branch: ${context.branch}`,
    `Commit SHA: ${context.sha}`,
    `Workflow run ID: ${context.runId}`,
    ``,
    `Unit tests: ${checkStatus('unit-tests')}`,
    `Integration tests: ${checkStatus('integration-tests')}`,
    `End-to-end tests: ${checkStatus('e2e-tests')}`,
    `Coverage: ${checkStatus('coverage')}`,
    `Build: ${checkStatus('build')}`,
    `Migration validation: ${checkStatus('migration-validation')}`,
    `Failed checks: ${summary.failedChecks.length > 0 ? summary.failedChecks.join(', ') : 'None'}`,
    ``,
    `Findings — CRITICAL ${report.counts.CRITICAL}, HIGH ${report.counts.HIGH}, MEDIUM ${report.counts.MEDIUM}, LOW ${report.counts.LOW}, INFORMATIONAL ${report.counts.INFORMATIONAL}`,
    ``,
    `Critical findings: ${critical.length > 0 ? critical.map((finding) => `${finding.id} ${finding.title}`).join('; ') : 'None'}`,
    `High findings: ${high.length > 0 ? high.map((finding) => `${finding.id} ${finding.title}`).join('; ') : 'None'}`,
    ``,
    `Top three recommended actions:`,
    ...(topThree.length > 0 ? topThree.map((finding, index) => `${index + 1}. ${finding.id} (${finding.severity}) ${finding.title}`) : ['None.']),
    ``,
    `Report path: ${summary.archiveMarkdown}`,
    `Workflow run URL: ${runUrl}`,
    `Report pull request URL: ${reportPrUrl}`,
    ``,
    `To authorise a fix: open the report, copy the AUTHORISATION REQUEST block beneath the finding,`,
    `then run the "Approved Fix Implementation" workflow with the approval statement`,
    `IMPLEMENT APPROVED FINDINGS.`,
    ``,
    `This report does not authorise a release or a deployment.`,
  ];
  const text = lines.join('\n');

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0D1B2A">
<h1 style="font-size:20px">Trade Tender repository health check</h1>
<p><strong>Overall status:</strong> ${escapeHtml(report.status)}<br>
<strong>Release recommendation:</strong> ${escapeHtml(report.release)}</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">
<tr><td>Repository</td><td><strong>${escapeHtml(String(context.repository))}</strong></td></tr>
<tr><td>Branch</td><td><strong>${escapeHtml(String(context.branch))}</strong></td></tr>
<tr><td>Commit SHA</td><td><code>${escapeHtml(String(context.sha))}</code></td></tr>
<tr><td>Workflow run ID</td><td>${escapeHtml(String(context.runId))}</td></tr>
<tr><td>Unit tests</td><td>${escapeHtml(checkStatus('unit-tests'))}</td></tr>
<tr><td>Integration tests</td><td>${escapeHtml(checkStatus('integration-tests'))}</td></tr>
<tr><td>End-to-end tests</td><td>${escapeHtml(checkStatus('e2e-tests'))}</td></tr>
<tr><td>Coverage</td><td>${escapeHtml(checkStatus('coverage'))}</td></tr>
<tr><td>Build</td><td>${escapeHtml(checkStatus('build'))}</td></tr>
<tr><td>Migration validation</td><td>${escapeHtml(checkStatus('migration-validation'))}</td></tr>
</table>
<p><strong>Findings:</strong> CRITICAL ${report.counts.CRITICAL} · HIGH ${report.counts.HIGH} · MEDIUM ${report.counts.MEDIUM} · LOW ${report.counts.LOW} · INFORMATIONAL ${report.counts.INFORMATIONAL}</p>
<p><strong>Critical:</strong> ${critical.length > 0 ? escapeHtml(critical.map((finding) => `${finding.id} ${finding.title}`).join('; ')) : 'None'}<br>
<strong>High:</strong> ${high.length > 0 ? escapeHtml(high.map((finding) => `${finding.id} ${finding.title}`).join('; ')) : 'None'}</p>
<h2 style="font-size:16px">Top three recommended actions</h2>
<ol>${topThree.length > 0 ? topThree.map((finding) => `<li>${escapeHtml(finding.id)} (${escapeHtml(finding.severity)}) ${escapeHtml(finding.title)}</li>`).join('') : '<li>None.</li>'}</ol>
<p><strong>Report path:</strong> <code>${escapeHtml(summary.archiveMarkdown)}</code><br>
<strong>Workflow run:</strong> ${escapeHtml(String(runUrl))}<br>
<strong>Report pull request:</strong> ${escapeHtml(reportPrUrl)}</p>
<p>To authorise a fix, copy the AUTHORISATION REQUEST block from the report and run the
<strong>Approved Fix Implementation</strong> workflow with the approval statement
<code>IMPLEMENT APPROVED FINDINGS</code>.</p>
<p style="color:#6B7280;font-size:12px">This report does not authorise a release or a deployment.</p>
</body></html>`;

  const attachments = existsSync(summary.archiveMarkdown)
    ? [{ filename: summary.archiveMarkdown.split('/').pop() as string, content: Buffer.from(readFileSync(summary.archiveMarkdown)).toString('base64') }]
    : [];

  void sendHealthReportEmail(
    { subject: `Trade Tender repository health check - ${report.status} - ${date}`, html, text },
    attachments
  ).then((result) => {
    if (!result.sent) {
      // Reason is a provider message, never a credential.
      console.error(`EMAIL DELIVERY FAILED: ${result.reason}`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## ❌ EMAIL DELIVERY FAILED\n\n${result.reason}\n\nThe technical report was still generated and preserved at \`${summary.archiveMarkdown}\`.\n`, { flag: 'a' });
      }
      process.exit(1);
    }
    console.log('Health report email delivered.');
    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Health report email delivered\n\nStatus: ${report.status}\n`, { flag: 'a' });
    }
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : 'Unknown Resend error';
    console.error(`EMAIL DELIVERY FAILED: ${reason}`);
    process.exit(1);
  });
}

main();
