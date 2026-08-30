import { CHECK_STATUS, commandLabel } from './checks.mjs';
import { LIFECYCLE, SEVERITY } from './findings.mjs';

export const OVERALL_STATUS = { PASS: 'PASS', PASS_WITH_WARNINGS: 'PASS WITH WARNINGS', FAIL: 'FAIL', INCOMPLETE: 'INCOMPLETE' };
export const RELEASE = { ELIGIBLE: 'ELIGIBLE FOR FIX REVIEW', BLOCKED: 'RELEASE BLOCKED', NONE: 'NO RELEASE REQUIRED' };

/** Section Q failure conditions, evaluated from the recorded results only. */
export function determineOverallStatus(results, findings) {
  const criticalCheckFailed = results.some((result) => result.critical && (result.status === CHECK_STATUS.FAILED || result.status === CHECK_STATUS.TIMED_OUT));
  const essentialUnavailable = results.some((result) => result.critical && result.status === CHECK_STATUS.UNAVAILABLE && result.id !== 'secret-scan');
  const activeFindings = findings.filter((item) => item.lifecycle !== LIFECYCLE.RESOLVED);
  const confirmedCritical = activeFindings.some((item) => item.severity === 'CRITICAL' && item.confidence === 'Confirmed');

  if (criticalCheckFailed || confirmedCritical) return OVERALL_STATUS.FAIL;
  if (essentialUnavailable) return OVERALL_STATUS.INCOMPLETE;

  const anyFailure = results.some((result) => result.status === CHECK_STATUS.FAILED || result.status === CHECK_STATUS.TIMED_OUT);
  const anyActionable = activeFindings.some((item) => item.actionable && ['HIGH', 'MEDIUM'].includes(item.severity));
  if (anyFailure || anyActionable) return OVERALL_STATUS.PASS_WITH_WARNINGS;
  return OVERALL_STATUS.PASS;
}

export function determineRelease(status, findings) {
  const activeFindings = findings.filter((item) => item.lifecycle !== LIFECYCLE.RESOLVED);
  if (status === OVERALL_STATUS.FAIL || status === OVERALL_STATUS.INCOMPLETE) return RELEASE.BLOCKED;
  if (activeFindings.some((item) => item.actionable)) return RELEASE.ELIGIBLE;
  return RELEASE.NONE;
}

export function countBySeverity(findings) {
  const counts = Object.fromEntries(SEVERITY.map((severity) => [severity, 0]));
  for (const item of findings) {
    if (item.lifecycle === LIFECYCLE.RESOLVED) continue;
    counts[item.severity] += 1;
  }
  return counts;
}

function authorisationBlock(finding, context) {
  return `
--------------------------------------------------
AUTHORISATION REQUEST

Health-check run: ${context.runId}
Finding ID: ${finding.id}
Severity: ${finding.severity}
Confidence: ${finding.confidence}
Lifecycle state: ${finding.lifecycle}

Recommended decision:

[ ] APPROVE FIX
[ ] REJECT
[ ] DEFER
[ ] ACCEPT RISK

Approved scope: ${finding.approvedScopeRecommendation}
Expected files: ${finding.expectedFiles.length > 0 ? finding.expectedFiles.join(', ') : (finding.affectedFiles.join(', ') || 'To be determined during implementation, within the approved scope above.')}
Required regression test: ${finding.regressionTestRequired}
Acceptance criteria: ${finding.acceptanceCriteria}
Maximum permitted change risk: ${finding.changeRisk}
Additional restrictions: Do not modify unrelated files, weaken tests, or change deployment behaviour.

COPY-READY APPROVAL PROMPT

Run the Approved Fix Implementation workflow.

HEALTH CHECK RUN ID:
${context.runId}

APPROVED FINDING IDS:
${finding.id}

APPROVED SCOPE:
${finding.approvedScopeRecommendation}

APPROVAL STATEMENT:
IMPLEMENT APPROVED FINDINGS

Implement only the approved finding and remain strictly within the approved scope.

Add the required regression test.
Do not modify unrelated files.
Do not weaken or delete existing tests.
Do not suppress failures to obtain a passing result.
Run all applicable validation checks.
Create a draft pull request targeting main.
Email the result through the configured Resend health-report channel.

Do not push directly to main.
Do not merge.
Do not deploy.
--------------------------------------------------
`;
}

function renderFinding(finding, context) {
  const lines = [
    `### ${finding.id} — ${finding.title}`,
    '',
    `- **Severity:** ${finding.severity}`,
    `- **Confidence:** ${finding.confidence}`,
    `- **Lifecycle state:** ${finding.lifecycle}`,
    `- **First seen:** ${finding.firstSeen ?? context.runDate}`,
    '',
    `**Summary.** ${finding.summary}`,
    '',
    '**Evidence.**',
    '',
    finding.evidence || '_No evidence captured._',
    '',
    `**Affected files.** ${finding.affectedFiles.length > 0 ? finding.affectedFiles.map((file) => `\`${file}\``).join(', ') : 'Not file specific.'}`,
    `**Line numbers.** ${finding.lineNumbers.length > 0 ? finding.lineNumbers.slice(0, 25).join(', ') : 'Not applicable.'}`,
    '',
    `**Reproduction steps.** ${finding.reproductionSteps}`,
    `**User impact.** ${finding.userImpact}`,
    `**Business impact.** ${finding.businessImpact}`,
    `**Likely root cause.** ${finding.rootCause}`,
    `**Recommended fix.** ${finding.recommendedFix}`,
    `**Approved-scope recommendation.** ${finding.approvedScopeRecommendation}`,
    `**Expected files to change.** ${finding.expectedFiles.length > 0 ? finding.expectedFiles.join(', ') : 'Within the approved scope above.'}`,
    `**Regression test required.** ${finding.regressionTestRequired}`,
    `**Acceptance criteria.** ${finding.acceptanceCriteria}`,
    `**Validation commands.** ${finding.validationCommands.map((command) => `\`${command}\``).join(', ')}`,
    `**Dependencies.** ${finding.dependencies}`,
    `**Change risk.** ${finding.changeRisk}`,
    `**Rollback considerations.** ${finding.rollbackConsiderations}`,
  ];

  if (finding.actionable && finding.lifecycle !== LIFECYCLE.RESOLVED) {
    lines.push('', authorisationBlock(finding, context));
  }

  return lines.join('\n');
}

function statusTable(results) {
  const rows = results.map((result) => `| ${result.name} | \`${commandLabel(result)}\` | ${result.status} | ${result.durationMs ? `${Math.round(result.durationMs / 1000)}s` : '—'} |`);
  return ['| Check | Command | Result | Duration |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function unavailableTable(results) {
  const rows = results
    .filter((result) => [CHECK_STATUS.SKIPPED, CHECK_STATUS.UNAVAILABLE, CHECK_STATUS.BLOCKED, CHECK_STATUS.TIMED_OUT].includes(result.status))
    .map((result) => `| ${result.name} | ${result.status} | ${result.reason ?? 'Not recorded.'} | ${result.risk ?? 'Not recorded.'} | ${result.correctiveAction ?? 'Not recorded.'} |`);
  if (rows.length === 0) return '_All discovered checks ran._';
  return ['| Check | Status | Reason | Risk created | Required corrective action |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

export function renderMarkdown({ context, results, findings, status, release, counts }) {
  const active = findings.filter((item) => item.lifecycle !== LIFECYCLE.RESOLVED);
  const byLifecycle = (state) => findings.filter((item) => item.lifecycle === state);
  const actionable = active.filter((item) => item.actionable);

  const priorities = [...actionable]
    .sort((first, second) => SEVERITY.indexOf(first.severity) - SEVERITY.indexOf(second.severity))
    .slice(0, 3)
    .map((item, index) => `${index + 1}. **${item.id}** (${item.severity}) — ${item.title}`);

  return `# Trade Tender repository health check

**Overall status: ${status}**
**Release recommendation: ${release}**

## 1. Executive summary

The audit ran ${results.length} discovered checks against \`${context.branch}\` at commit \`${context.shortSha}\`.
${counts.CRITICAL} critical, ${counts.HIGH} high, ${counts.MEDIUM} medium, ${counts.LOW} low and ${counts.INFORMATIONAL} informational findings are currently open.
${status === OVERALL_STATUS.FAIL ? 'One or more release-blocking conditions were met.' : status === OVERALL_STATUS.INCOMPLETE ? 'Essential checks could not run, so the result is incomplete.' : 'No release-blocking condition was met.'}
This audit does not approve its own release and does not implement fixes.

## 2. Run metadata

| Field | Value |
| --- | --- |
| Repository | ${context.repository} |
| Branch | ${context.branch} |
| Commit SHA | \`${context.sha}\` |
| Trigger type | ${context.trigger} |
| Workflow run ID | ${context.runId} |
| Started | ${context.startedAt} |
| Completed | ${context.completedAt} |
| Environment | ${context.environment} |
| Audit scope | ${context.scope} |

## 3. Check results

${statusTable(results)}

**Test summary.** Unit tests: ${results.find((result) => result.id === 'unit-tests')?.status ?? 'UNAVAILABLE'}. Integration: ${results.find((result) => result.id === 'integration-tests')?.status ?? 'UNAVAILABLE'}. Regression: ${results.find((result) => result.id === 'regression-tests')?.status ?? 'UNAVAILABLE'}. End-to-end: ${results.find((result) => result.id === 'e2e-tests')?.status ?? 'UNAVAILABLE'}.

**Coverage summary.** ${results.find((result) => result.id === 'coverage')?.status === CHECK_STATUS.PASSED ? 'See coverage artifact.' : 'UNAVAILABLE — this repository has no coverage command, so coverage reductions cannot be detected.'}

**Build result.** ${results.find((result) => result.id === 'build')?.status ?? 'UNAVAILABLE'}

**Migration result.** ${results.find((result) => result.id === 'migration-validation')?.status ?? 'UNAVAILABLE'} (schema validation: ${results.find((result) => result.id === 'schema-validation')?.status ?? 'UNAVAILABLE'}, production schema drift: ${results.find((result) => result.id === 'schema-drift')?.status ?? 'UNAVAILABLE'})

**Security result.** Dependency audit: ${results.find((result) => result.id === 'dependency-audit')?.status ?? 'UNAVAILABLE'}. Secret scanning: ${results.find((result) => result.id === 'secret-scan')?.status ?? 'UNAVAILABLE'}. Static analysis: ${results.find((result) => result.id === 'sast')?.status ?? 'UNAVAILABLE'}.

## 4. Findings by severity

| Severity | Open |
| --- | ---: |
| CRITICAL | ${counts.CRITICAL} |
| HIGH | ${counts.HIGH} |
| MEDIUM | ${counts.MEDIUM} |
| LOW | ${counts.LOW} |
| INFORMATIONAL | ${counts.INFORMATIONAL} |

## 5. Detailed findings and authorisation blocks

${active.length === 0 ? '_No open findings._' : active.map((item) => renderFinding(item, context)).join('\n\n---\n\n')}

## 6. Finding lifecycle

- **New:** ${byLifecycle(LIFECYCLE.NEW).map((item) => item.id).join(', ') || 'None'}
- **Continuing:** ${byLifecycle(LIFECYCLE.CONTINUING).map((item) => item.id).join(', ') || 'None'}
- **Resolved since previous audit:** ${byLifecycle(LIFECYCLE.RESOLVED).map((item) => item.id).join(', ') || 'None'}
- **Reopened:** ${byLifecycle(LIFECYCLE.REOPENED).map((item) => item.id).join(', ') || 'None'}
- **Deferred:** ${byLifecycle(LIFECYCLE.DEFERRED).map((item) => item.id).join(', ') || 'None'}
- **Risk accepted:** ${byLifecycle(LIFECYCLE.RISK_ACCEPTED).map((item) => item.id).join(', ') || 'None'}

## 7. Changes since the previous audit

${context.previousReport ? `Compared against \`${context.previousReport}\`.` : 'No previous archived audit was found; every finding is recorded as New.'}
${context.commitsSincePrevious ? `\n\nCommits since the previous audit:\n\n\`\`\`\n${context.commitsSincePrevious}\n\`\`\`` : ''}

## 8. Recommended priorities

${priorities.length > 0 ? priorities.join('\n') : '_No actionable findings._'}

## 9. Commands executed

${results.filter((result) => result.command).map((result) => `- \`${commandLabel(result)}\` → ${result.status}`).join('\n') || '_None._'}

## 10. Checks skipped, unavailable, blocked or timed out

${unavailableTable(results)}

## 11. Delivery status

| Item | Value |
| --- | --- |
| Report writing status | ${context.reportStatus} |
| Email delivery status | ${context.emailStatus} |
| Workflow run URL | ${context.runUrl} |
| Report pull request URL | ${context.reportPrUrl} |

---

_Generated by the Trade Tender repository health check. This report is evidence for a human decision; it does not authorise a release._
`;
}

export function renderJson({ context, results, findings, status, release, counts }) {
  return {
    schemaVersion: 1,
    status,
    release,
    context,
    counts,
    checks: results.map((result) => ({
      id: result.id,
      name: result.name,
      category: result.category,
      critical: result.critical ?? false,
      command: result.command ? commandLabel(result) : null,
      status: result.status,
      durationMs: result.durationMs ?? 0,
      exitCode: result.exitCode ?? null,
      reason: result.reason ?? null,
      risk: result.risk ?? null,
      correctiveAction: result.correctiveAction ?? null,
    })),
    findings,
  };
}
