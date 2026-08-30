#!/usr/bin/env node
/**
 * Verifies a staging or production deployment authorisation before any deployment step runs.
 *
 * Every condition that was previously asserted in a chat message is checked here against the
 * repository itself, so an unfilled placeholder or an unverifiable claim stops the release.
 *
 * Usage:
 *   node scripts/health-check/verify-deployment-approval.mjs \
 *     --target production \
 *     --sha <40-character commit sha> \
 *     --statement "DEPLOY APPROVED COMMIT TO PRODUCTION" \
 *     --staging-report deploy-staging-2026-08-30-0900-UTC
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DEPLOYMENT_DIR = 'docs/health-check/deployments';

const EXPECTED_STATEMENT = {
  'staging-branch': 'PROMOTE APPROVED COMMIT TO STAGING BRANCH',
  staging: 'DEPLOY APPROVED COMMIT TO STAGING',
  production: 'DEPLOY APPROVED COMMIT TO PRODUCTION',
};

const failures = [];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, '')] = argv[index + 1] ?? '';
  }
  return args;
}

function block(message) {
  failures.push(message);
  console.error(`  \u2717 ${message}`);
}

function pass(message) {
  console.log(`  \u2713 ${message}`);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** Rejects the unfilled prompt placeholders that must never reach a deployment gate. */
function isPlaceholder(value) {
  return !value || /^\[.*\]$/.test(value.trim()) || /PASTE|<[A-Z_ ]+>|TODO|EXAMPLE/i.test(value);
}

const args = parseArgs(process.argv.slice(2));
const target = (args.target ?? '').trim();
const mainRef = (args['main-ref'] ?? 'origin/main').trim();

if (!Object.prototype.hasOwnProperty.call(EXPECTED_STATEMENT, target)) {
  console.error(`VERIFICATION FAILED: --target must be "staging-branch", "staging" or "production", received "${target}".`);
  process.exit(1);
}

console.log(`Verifying ${target} deployment authorisation`);

// 1. Approval statement must match exactly.
if (args.statement !== EXPECTED_STATEMENT[target]) {
  block(`The approval statement must be exactly: ${EXPECTED_STATEMENT[target]}`);
} else {
  pass('Approval statement matches exactly');
}

// 2. The commit SHA must be a real value, not an unfilled placeholder.
const sha = (args.sha ?? '').trim();
if (isPlaceholder(sha)) {
  block(`commit_sha is an unfilled placeholder ("${sha || 'empty'}"). Supply the real 40-character commit SHA.`);
} else if (!/^[0-9a-f]{40}$/i.test(sha)) {
  block(`commit_sha "${sha}" is not a 40-character SHA. Abbreviated SHAs are not accepted for a release.`);
} else {
  pass('Commit SHA is well formed');

  // 3. The commit must exist and be an ancestor of main.
  let exists = true;
  try {
    git('cat-file', '-e', `${sha}^{commit}`);
  } catch {
    exists = false;
  }

  if (!exists) {
    block(`Commit ${sha} does not exist in this repository.`);
  } else {
    pass('Commit exists in the repository');
    try {
      git('rev-parse', '--verify', mainRef);
    } catch {
      block(`Main reference "${mainRef}" is not available in this checkout.`);
    }

    try {
      execFileSync('git', ['merge-base', '--is-ancestor', sha, mainRef], { stdio: 'ignore' });
      pass('Commit is present on main');
    } catch {
      block(`Commit ${sha} is not present on main. Only reviewed, merged commits may be deployed.`);
    }

    // 4. Nothing may have landed on main after the approved commit.
    const head = git('rev-parse', mainRef);
    if (head !== sha) {
      const ahead = git('rev-list', '--count', `${sha}..${mainRef}`);
      block(`main has advanced ${ahead} commit(s) beyond the approved commit (main is at ${head.slice(0, 12)}). The approval is stale.`);
    } else {
      pass('Approved commit is the current head of main; no code changed after approval');
    }
  }
}

// 5. Production additionally requires a successful staging record for the identical commit.
if (target === 'production') {
  const reportId = (args['staging-report'] ?? '').trim();

  if (isPlaceholder(reportId)) {
    block(`staging_report is an unfilled placeholder ("${reportId || 'empty'}"). Supply the staging record identifier.`);
  } else if (!existsSync(DEPLOYMENT_DIR)) {
    block(`No staging records exist. ${DEPLOYMENT_DIR} has never been written, so no commit has been validated in staging.`);
  } else {
    const candidates = readdirSync(DEPLOYMENT_DIR).filter((file) => file.endsWith('.json'));
    const match = candidates.find((file) => file === `${reportId}.json` || file === reportId);

    if (!match) {
      block(`Staging record "${reportId}" was not found. Available records: ${candidates.join(', ') || 'none'}`);
    } else {
      let record;
      try {
        record = JSON.parse(readFileSync(path.join(DEPLOYMENT_DIR, match), 'utf8'));
      } catch {
        record = null;
      }

      if (!record) {
        block(`Staging record ${match} could not be parsed.`);
      } else {
        record.target === 'staging'
          ? pass('Referenced record is a staging deployment')
          : block(`Record ${match} is a "${record.target}" record, not a staging record.`);

        record.result === 'SUCCESSFUL'
          ? pass('Staging deployment was successful')
          : block(`Staging record ${match} reports "${record.result}". Production requires a successful staging run.`);

        record.commitSha === sha
          ? pass('Staging validated this exact commit')
          : block(`Staging validated ${String(record.commitSha).slice(0, 12)}, not the requested ${sha.slice(0, 12)}. The exact commit must be the one that passed staging.`);

        const failed = (record.verification ?? []).filter((entry) => entry.status === 'FAIL');
        failed.length === 0
          ? pass('No staging verification check failed')
          : block(`Staging verification recorded ${failed.length} failing check(s): ${failed.map((entry) => entry.name).join(', ')}`);
      }
    }
  }
}

// 6. No confirmed Critical finding may be open in the latest audit.
if (existsSync('docs/health-check/latest.json')) {
  try {
    const latest = JSON.parse(readFileSync('docs/health-check/latest.json', 'utf8'));
    const openCritical = (latest.findings ?? []).filter(
      (finding) => finding.severity === 'CRITICAL' && finding.confidence === 'Confirmed' && finding.lifecycle !== 'Resolved'
    );
    openCritical.length === 0
      ? pass('No confirmed Critical finding is open')
      : block(`${openCritical.length} confirmed Critical finding(s) remain open: ${openCritical.map((finding) => finding.id).join(', ')}`);
  } catch {
    block('docs/health-check/latest.json could not be parsed.');
  }
} else {
  block('No health-check report is available, so outstanding findings cannot be confirmed.');
}

const evidence = {
  target,
  commitSha: sha,
  stagingReport: target === 'production' ? (args['staging-report'] ?? '').trim() : null,
  authorisingActor: process.env.GITHUB_ACTOR ?? 'unknown',
  approvalTime: new Date().toISOString(),
  workflowRunId: process.env.GITHUB_RUN_ID ?? 'local',
  verified: failures.length === 0,
  blockedReasons: failures,
};

mkdirSync(DEPLOYMENT_DIR, { recursive: true });
writeFileSync('docs/health-check/deployment-approval.json', `${JSON.stringify(evidence, null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    [`verified=${evidence.verified}`, `actor=${evidence.authorisingActor}`, `approval_time=${evidence.approvalTime}`].join('\n') + '\n',
    { flag: 'a' }
  );
}

if (failures.length > 0) {
  const summary = [`## ${target.toUpperCase()} DEPLOYMENT BLOCKED`, '', ...failures.map((reason) => `- ${reason}`), ''].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  console.error(`\nVERIFICATION FAILED: ${failures.length} blocking condition(s).`);
  process.exit(1);
}

console.log(`\nAuthorisation verified. Actor: ${evidence.authorisingActor}. Time: ${evidence.approvalTime}`);
