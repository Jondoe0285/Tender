#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { discoverChecks, runCheck, CHECK_STATUS } from './lib/checks.mjs';
import { collectFindings, loadPreviousFindings } from './lib/findings.mjs';
import { countBySeverity, determineOverallStatus, determineRelease, renderJson, renderMarkdown } from './lib/report.mjs';

const REPORT_DIR = 'docs/health-check';
const ARCHIVE_DIR = path.join(REPORT_DIR, 'archive');

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

function timestampParts(date) {
  const iso = date.toISOString();
  return {
    runDate: iso.slice(0, 10).replace(/-/g, ''),
    fileDate: iso.slice(0, 10),
    fileTime: `${iso.slice(11, 13)}${iso.slice(14, 16)}`,
  };
}

function main() {
  const startedAt = new Date();
  const scope = process.env.AUDIT_SCOPE || 'full';
  const { runDate, fileDate, fileTime } = timestampParts(startedAt);
  const sha = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD'], 'unknown');
  const previous = loadPreviousFindings();

  const context = {
    repository: process.env.GITHUB_REPOSITORY || 'local',
    branch: process.env.GITHUB_REF_NAME || git(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown'),
    sha,
    shortSha: sha.slice(0, 7),
    trigger: process.env.GITHUB_EVENT_NAME || 'local',
    runId: process.env.GITHUB_RUN_ID || `local-${startedAt.getTime()}`,
    runUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : 'Not applicable (local run).',
    environment: process.env.GITHUB_ACTIONS ? `GitHub Actions (${process.env.RUNNER_OS ?? 'unknown'})` : 'Local workstation',
    scope,
    startedAt: startedAt.toISOString(),
    runDate,
    previousReport: previous.reportName,
    reportStatus: 'PENDING',
    emailStatus: process.env.EMAIL_STATUS || 'PENDING',
    reportPrUrl: process.env.REPORT_PR_URL || 'Created by a later job in this workflow run.',
    commitsSincePrevious: '',
  };

  const checks = discoverChecks({ scope });
  const results = [];
  for (const check of checks) {
    process.stdout.write(`▸ ${check.name}… `);
    const result = runCheck(check);
    results.push(result);
    process.stdout.write(`${result.status}\n`);
  }

  const findings = collectFindings(results, { runDate });
  const status = determineOverallStatus(results, findings);
  const release = determineRelease(status, findings);
  const counts = countBySeverity(findings);

  context.completedAt = new Date().toISOString();
  context.commitsSincePrevious = git(['log', '-10', '--pretty=format:%h %s'], '');

  mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archiveBase = `health-check-${fileDate}-${fileTime}-UTC`;
  const markdown = renderMarkdown({ context: { ...context, reportStatus: 'WRITTEN' }, results, findings, status, release, counts });
  const json = renderJson({ context: { ...context, reportStatus: 'WRITTEN' }, results, findings, status, release, counts });

  const archiveMarkdownPath = path.join(ARCHIVE_DIR, `${archiveBase}.md`);
  const archiveJsonPath = path.join(ARCHIVE_DIR, `${archiveBase}.json`);

  // Archive reports are immutable: refuse to overwrite an existing file.
  for (const target of [archiveMarkdownPath, archiveJsonPath]) {
    writeFileSync(target, '', { flag: 'wx' });
  }
  writeFileSync(archiveMarkdownPath, markdown);
  writeFileSync(archiveJsonPath, `${JSON.stringify(json, null, 2)}\n`);
  writeFileSync(path.join(REPORT_DIR, 'latest.md'), markdown);
  writeFileSync(path.join(REPORT_DIR, 'latest.json'), `${JSON.stringify(json, null, 2)}\n`);

  const summary = {
    status,
    release,
    counts,
    archiveMarkdown: archiveMarkdownPath,
    archiveJson: archiveJsonPath,
    reportBranch: `health-report/${fileDate}-${fileTime}`,
    title: `[Health Check] ${fileDate} - ${status}`,
    failedChecks: results.filter((result) => result.status === CHECK_STATUS.FAILED || result.status === CHECK_STATUS.TIMED_OUT).map((result) => result.name),
  };
  writeFileSync(path.join(REPORT_DIR, 'run-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  if (process.env.GITHUB_OUTPUT) {
    const outputs = [
      `status=${status}`,
      `release=${release}`,
      `report_branch=${summary.reportBranch}`,
      `report_title=${summary.title}`,
      `archive_markdown=${archiveMarkdownPath}`,
      `critical=${counts.CRITICAL}`,
      `high=${counts.HIGH}`,
    ].join('\n');
    writeFileSync(process.env.GITHUB_OUTPUT, `${outputs}\n`, { flag: 'a' });
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Health check: ${status}\n\nRelease recommendation: **${release}**\n\nCritical: ${counts.CRITICAL} · High: ${counts.HIGH} · Medium: ${counts.MEDIUM} · Low: ${counts.LOW}\n\nReport: \`${archiveMarkdownPath}\`\n`, { flag: 'a' });
  }

  console.log(`\nOverall status: ${status}`);
  console.log(`Release recommendation: ${release}`);
  console.log(`Archive report: ${archiveMarkdownPath}`);

  // The audit reports; it never fails the workflow for findings alone. Release gating is
  // enforced by the merge workflow so a FAIL result still produces a preserved report.
  process.exit(0);
}

main();
