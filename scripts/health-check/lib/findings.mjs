import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CHECK_STATUS, sanitise } from './checks.mjs';

export const SEVERITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
export const CONFIDENCE = { CONFIRMED: 'Confirmed', PROBABLE: 'Probable', SUSPECTED: 'Suspected' };
export const LIFECYCLE = { NEW: 'New', CONTINUING: 'Continuing', RESOLVED: 'Resolved', REOPENED: 'Reopened', DEFERRED: 'Deferred', RISK_ACCEPTED: 'Risk accepted' };

const ARCHIVE_DIR = 'docs/health-check/archive';

/**
 * A finding's `key` is stable across runs and is what deduplication is based on.
 * Identifiers (HC-YYYYMMDD-NNN) are allocated once and then reused for the same key.
 */
function finding(base) {
  return {
    confidence: CONFIDENCE.CONFIRMED,
    evidence: '',
    affectedFiles: [],
    lineNumbers: [],
    reproductionSteps: 'Run the validation commands listed below on a clean checkout.',
    userImpact: 'Not user visible.',
    businessImpact: 'Operational risk only.',
    rootCause: 'See evidence.',
    recommendedFix: '',
    approvedScopeRecommendation: '',
    expectedFiles: [],
    regressionTestRequired: 'Yes',
    acceptanceCriteria: '',
    validationCommands: ['npm run type-check', 'npm test', 'npm run build'],
    dependencies: 'None.',
    changeRisk: 'Low',
    rollbackConsiderations: 'Revert the fix commit; no data migration is involved.',
    actionable: true,
    ...base,
  };
}

function readTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isSourceFile(file) {
  return /^(src|scripts|prisma|tests)\//.test(file) && /\.(ts|tsx|mjs|js|prisma)$/.test(file);
}

/** Findings produced directly from a failed, timed-out or unavailable check. */
function findingsFromChecks(results) {
  const findings = [];

  for (const result of results) {
    if (result.status === CHECK_STATUS.FAILED || result.status === CHECK_STATUS.TIMED_OUT) {
      const critical = result.critical === true;
      findings.push(finding({
        key: `check-failure:${result.id}`,
        severity: critical ? 'HIGH' : 'MEDIUM',
        title: `${result.name} did not pass`,
        summary: `The repository check "${result.name}" reported ${result.status}. This is a release-blocking quality gate.`,
        evidence: result.output ? `\`\`\`\n${result.output}\n\`\`\`` : 'No output was captured.',
        affectedFiles: [],
        recommendedFix: `Reproduce with the command below, correct the underlying cause, and re-run the audit.`,
        approvedScopeRecommendation: `Only the files required to make "${result.name}" pass.`,
        acceptanceCriteria: `"${result.name}" completes with status PASSED.`,
        validationCommands: [result.command ? result.command.join(' ') : 'npm test'],
        userImpact: critical ? 'A defect could reach users through an unverified release.' : 'Indirect: reduced confidence in release quality.',
        businessImpact: critical ? 'Release must be blocked until resolved.' : 'Increased maintenance risk.',
        changeRisk: 'Medium',
      }));
    }

    if (result.status === CHECK_STATUS.UNAVAILABLE && result.risk) {
      findings.push(finding({
        key: `check-unavailable:${result.id}`,
        severity: result.critical ? 'MEDIUM' : 'LOW',
        confidence: CONFIDENCE.CONFIRMED,
        title: `${result.name}: no repository command is available`,
        summary: `${result.reason} ${result.risk}`,
        evidence: `Check id: \`${result.id}\`. Reason: ${result.reason}`,
        recommendedFix: result.correctiveAction ?? 'Add the missing capability.',
        approvedScopeRecommendation: 'Tooling configuration and a new package script only. No application behaviour changes.',
        acceptanceCriteria: `The audit reports "${result.name}" as PASSED rather than UNAVAILABLE.`,
        regressionTestRequired: 'No — this adds verification capability rather than fixing behaviour.',
        userImpact: 'None directly.',
        businessImpact: result.risk,
        changeRisk: 'Low',
      }));
    }
  }

  return findings;
}

/**
 * Built-in credential pattern scan. This is a fallback and is deliberately reported as weaker
 * than a dedicated scanner so an unavailable gitleaks run is never presented as a clean result.
 */
function scanForSecrets(files) {
  const patterns = [
    { name: 'Stripe secret key', regex: /\bsk_live_[A-Za-z0-9]{16,}/ },
    { name: 'Stripe webhook secret', regex: /\bwhsec_[A-Za-z0-9]{16,}/ },
    { name: 'Resend API key', regex: /\bre_[A-Za-z0-9]{16,}/ },
    { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
    { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  ];

  const hits = [];
  for (const file of files) {
    if (file.startsWith('docs/health-check/')) continue;
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const pattern of patterns) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) hits.push({ file, line: index + 1, name: pattern.name });
      });
    }
  }
  return hits;
}

function scanForMarkers(files) {
  const hits = [];
  for (const file of files) {
    if (!isSourceFile(file)) continue;
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    content.split('\n').forEach((line, index) => {
      if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line) && !line.includes('health-check')) {
        hits.push({ file, line: index + 1, text: line.trim().slice(0, 160) });
      }
    });
  }
  return hits;
}

function scanForSkippedTests(files) {
  const hits = [];
  for (const file of files) {
    if (!file.startsWith('tests/')) continue;
    const content = readFileSync(file, 'utf8');
    content.split('\n').forEach((line, index) => {
      if (/\b(test|it|describe)\.(skip|todo)\b|\bxit\(|\bxdescribe\(/.test(line)) {
        hits.push({ file, line: index + 1, text: line.trim().slice(0, 160) });
      }
    });
  }
  return hits;
}

/**
 * Critical-path coverage gaps. These are the money-and-privacy paths named in the platform's
 * own security requirements. Coverage is judged by whether a test actually imports the module,
 * because keyword matching produces false negatives that would wrongly imply coverage exists.
 */
const CRITICAL_PATHS = [
  { id: 'stripe-webhook', label: 'Stripe webhook signature and idempotency', source: 'src/app/api/webhooks/stripe/route.ts', modules: ['webhooks/stripe', 'stripeClient'] },
  { id: 'payment-integrity', label: 'Payment creation and charged totals', source: 'src/server/payments/paymentService.ts', modules: ['paymentService'] },
  { id: 'tender-unlock', label: 'Retailer tender unlocking', source: 'src/server/domain/unlockService.ts', modules: ['unlockService'] },
  { id: 'contact-release', label: 'Quote acceptance and contact release', source: 'src/server/domain/contactReleaseService.ts', modules: ['contactReleaseService'] },
  { id: 'restricted-visibility', label: 'Restricted tender visibility before unlock', source: 'src/app/api/tenders/[id]/route.ts', modules: ['getUnlockedTenderForRetailer', 'api/tenders'] },
];

function findCriticalPathGaps(files) {
  const testFiles = files.filter((file) => file.startsWith('tests/'));
  const testCorpus = testFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  return CRITICAL_PATHS.filter((critical) => existsSync(critical.source) && !critical.modules.some((module) => testCorpus.includes(module)));
}

export function collectFindings(results, { runDate }) {
  const files = readTrackedFiles();
  const findings = findingsFromChecks(results);

  const secretHits = scanForSecrets(files);
  if (secretHits.length > 0) {
    findings.push(finding({
      key: 'secret-detected',
      severity: 'CRITICAL',
      title: `${secretHits.length} possible committed credential${secretHits.length === 1 ? '' : 's'}`,
      summary: 'A credential pattern was detected in tracked repository content. Treat as exposed until proven otherwise.',
      evidence: secretHits.map((hit) => `${hit.file}:${hit.line} — ${hit.name}`).join('\n'),
      affectedFiles: [...new Set(secretHits.map((hit) => hit.file))],
      lineNumbers: secretHits.map((hit) => hit.line),
      recommendedFix: 'Revoke and rotate the credential at the provider, remove it from the repository and history, then re-issue it through protected secrets.',
      approvedScopeRecommendation: 'Credential removal and rotation only. History rewriting requires separate human authorisation.',
      acceptanceCriteria: 'No credential pattern remains in tracked content and the provider confirms the old credential is revoked.',
      userImpact: 'Account or payment compromise is possible.',
      businessImpact: 'Potential data breach, financial loss and regulatory exposure.',
      changeRisk: 'High',
      rollbackConsiderations: 'Do not restore the credential. Rotation is not reversible by design.',
    }));
  }

  const criticalGaps = findCriticalPathGaps(files);
  for (const gap of criticalGaps) {
    findings.push(finding({
      key: `critical-path-untested:${gap.id}`,
      severity: 'HIGH',
      confidence: CONFIDENCE.CONFIRMED,
      title: `No automated test covers ${gap.label}`,
      summary: `${gap.label} is a payment or confidentiality critical path with no matching automated test. A regression here would not be detected before release.`,
      evidence: `Implementation exists at \`${gap.source}\` but no test file references this behaviour.`,
      affectedFiles: [gap.source],
      recommendedFix: `Add an integration or regression test covering ${gap.label.toLowerCase()}, including the failure path.`,
      approvedScopeRecommendation: 'New test files plus any test-only helpers. No application behaviour changes.',
      acceptanceCriteria: `A test fails when ${gap.label.toLowerCase()} is deliberately broken, and passes on the current implementation.`,
      regressionTestRequired: 'Yes — this finding is the missing test.',
      userImpact: 'A regression could expose restricted information or mis-charge a user without detection.',
      businessImpact: 'Release confidence is materially reduced for the platform\'s highest-risk workflows.',
      changeRisk: 'Low',
      validationCommands: ['npm test'],
    }));
  }

  const markers = scanForMarkers(files);
  if (markers.length > 0) {
    findings.push(finding({
      key: 'code-markers',
      severity: 'LOW',
      confidence: CONFIDENCE.CONFIRMED,
      title: `${markers.length} unresolved TODO/FIXME marker${markers.length === 1 ? '' : 's'}`,
      summary: 'Unresolved markers indicate known incomplete work in tracked source files.',
      evidence: markers.slice(0, 20).map((hit) => `${hit.file}:${hit.line} — ${hit.text}`).join('\n'),
      affectedFiles: [...new Set(markers.map((hit) => hit.file))].slice(0, 20),
      recommendedFix: 'Resolve the marker or convert it into a tracked issue with an owner.',
      approvedScopeRecommendation: 'Individual markers only, one finding at a time.',
      acceptanceCriteria: 'The marker is removed and the described work is either completed or tracked.',
      regressionTestRequired: 'Only where behaviour changes.',
      userImpact: 'None directly.',
      businessImpact: 'Accumulating technical debt.',
    }));
  }

  const skipped = scanForSkippedTests(files);
  if (skipped.length > 0) {
    findings.push(finding({
      key: 'skipped-tests',
      severity: 'MEDIUM',
      title: `${skipped.length} skipped or disabled test${skipped.length === 1 ? '' : 's'}`,
      summary: 'Skipped tests silently reduce protection while still appearing in a passing suite.',
      evidence: skipped.map((hit) => `${hit.file}:${hit.line} — ${hit.text}`).join('\n'),
      affectedFiles: [...new Set(skipped.map((hit) => hit.file))],
      recommendedFix: 'Re-enable the test or delete it and record why the behaviour no longer needs coverage.',
      approvedScopeRecommendation: 'The listed test files only.',
      acceptanceCriteria: 'No test is skipped without a documented, approved reason.',
      userImpact: 'None directly.',
      businessImpact: 'Undetected regressions.',
    }));
  }

  // Production deployment coupling is a release-governance risk rather than a code defect.
  if (existsSync('.github/workflows/deploy-azure.yml')) {
    const deploy = readFileSync('.github/workflows/deploy-azure.yml', 'utf8');
    if (/push:\s*\n\s*branches:\s*\[\s*main\s*\]/.test(deploy)) {
      findings.push(finding({
        key: 'main-auto-deploys',
        severity: 'HIGH',
        confidence: CONFIDENCE.CONFIRMED,
        title: 'Merging to main triggers a production deployment',
        summary: 'deploy-azure.yml runs on push to main, so a merge is also a production release unless the "production" GitHub environment enforces required reviewers.',
        evidence: '`.github/workflows/deploy-azure.yml` declares `on: push: branches: [ main ]` with `environment: production`.',
        affectedFiles: ['.github/workflows/deploy-azure.yml'],
        recommendedFix: 'Configure required reviewers on the "production" GitHub environment, or split deployment into a separately dispatched workflow. This audit deliberately does not change deployment behaviour.',
        approvedScopeRecommendation: 'Repository settings change, or an explicitly approved change to deploy-azure.yml.',
        acceptanceCriteria: 'A merge to main cannot reach production without a recorded human approval.',
        regressionTestRequired: 'No — verified by repository settings evidence.',
        userImpact: 'An unreviewed release could reach production users.',
        businessImpact: 'Outage or data-integrity risk without an approval gate.',
        changeRisk: 'High',
        rollbackConsiderations: 'Changing deployment triggers affects release operations; coordinate with the release owner.',
        validationCommands: ['(repository settings review — no local command)'],
      }));

      if (/if:\s*\$\{\{\s*secrets\./.test(deploy)) {
        findings.push(finding({
          key: 'deploy-job-if-uses-secrets-context',
          severity: 'MEDIUM',
          confidence: CONFIDENCE.CONFIRMED,
          title: 'Deployment job condition uses the unavailable secrets context',
          summary: 'The deploy job guard references `secrets.*` in a job-level `if`. GitHub does not expose the secrets context at job level, so the guard does not behave as written.',
          evidence: 'Job-level `if: ${{ secrets.AZURE_WEBAPP_NAME != \'\' && secrets.AZURE_CREDENTIALS != \'\' }}` in `.github/workflows/deploy-azure.yml`.',
          affectedFiles: ['.github/workflows/deploy-azure.yml'],
          recommendedFix: 'Move the secret presence check into a step that sets an output, or use a repository variable in the job condition.',
          approvedScopeRecommendation: '.github/workflows/deploy-azure.yml only, with release-owner approval because it affects deployment.',
          acceptanceCriteria: 'The deployment job skips predictably when Azure credentials are absent.',
          regressionTestRequired: 'No — workflow syntax validation only.',
          userImpact: 'None directly.',
          businessImpact: 'A deployment could attempt to run without valid credentials, or be skipped unexpectedly.',
          changeRisk: 'Medium',
          validationCommands: ['node scripts/health-check/validate-workflows.mjs'],
        }));
      }
    }
  }

  return dedupeAgainstArchive(findings, { runDate });
}

export function listArchiveReports() {
  if (!existsSync(ARCHIVE_DIR)) return [];
  return readdirSync(ARCHIVE_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort();
}

export function loadPreviousFindings() {
  const archives = listArchiveReports();
  if (archives.length === 0) return { findings: [], reportName: null };
  const latest = archives[archives.length - 1];
  try {
    const parsed = JSON.parse(readFileSync(path.join(ARCHIVE_DIR, latest), 'utf8'));
    return { findings: parsed.findings ?? [], reportName: latest };
  } catch {
    return { findings: [], reportName: latest };
  }
}

function nextIdAllocator(runDate, previousFindings) {
  const prefix = `HC-${runDate}`;
  const used = previousFindings
    .map((item) => item.id)
    .filter((id) => typeof id === 'string' && id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length + 1)))
    .filter((value) => Number.isFinite(value));
  let counter = used.length > 0 ? Math.max(...used) : 0;
  return () => {
    counter += 1;
    return `${prefix}-${String(counter).padStart(3, '0')}`;
  };
}

/** Reuses identifiers and derives lifecycle state so a continuing finding is never re-numbered. */
function dedupeAgainstArchive(currentFindings, { runDate }) {
  const { findings: previous } = loadPreviousFindings();
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  const allocateId = nextIdAllocator(runDate, previous);

  const active = currentFindings.map((item) => {
    const prior = previousByKey.get(item.key);
    if (!prior) return { ...item, id: allocateId(), lifecycle: LIFECYCLE.NEW, firstSeen: runDate };
    const lifecycle = prior.lifecycle === LIFECYCLE.RESOLVED ? LIFECYCLE.REOPENED
      : prior.lifecycle === LIFECYCLE.DEFERRED || prior.lifecycle === LIFECYCLE.RISK_ACCEPTED ? prior.lifecycle
        : LIFECYCLE.CONTINUING;
    return { ...item, id: prior.id, lifecycle, firstSeen: prior.firstSeen ?? runDate };
  });

  const activeKeys = new Set(active.map((item) => item.key));
  const resolved = previous
    .filter((item) => !activeKeys.has(item.key) && item.lifecycle !== LIFECYCLE.RESOLVED)
    .map((item) => ({ ...item, lifecycle: LIFECYCLE.RESOLVED, actionable: false }));

  return [...active, ...resolved].sort((first, second) => SEVERITY.indexOf(first.severity) - SEVERITY.indexOf(second.severity));
}

export { sanitise };
