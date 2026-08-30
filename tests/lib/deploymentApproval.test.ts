import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';

const SCRIPT = 'scripts/health-check/verify-deployment-approval.mjs';
const DIR = 'docs/health-check/deployments';

/** Runs the gate and returns its exit code plus combined output. */
function runGate(args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync('node', [SCRIPT, '--main-ref', 'HEAD', ...args], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

function headSha(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function writeStagingRecord(name: string, record: Record<string, unknown>): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/${name}.json`, JSON.stringify(record));
}

const PROD = ['--target', 'production', '--statement', 'DEPLOY APPROVED COMMIT TO PRODUCTION'];

test('rejects an unfilled placeholder commit SHA', () => {
  const result = runGate([...PROD, '--sha', '[PASTE STAGING-VALIDATED COMMIT SHA]', '--staging-report', 'anything']);
  assert.equal(result.code, 1);
  assert.match(result.output, /unfilled placeholder/);
});

test('rejects an abbreviated commit SHA', () => {
  const result = runGate([...PROD, '--sha', '131684c', '--staging-report', 'anything']);
  assert.equal(result.code, 1);
  assert.match(result.output, /not a 40-character SHA/);
});

test('rejects a commit that does not exist', () => {
  const result = runGate([...PROD, '--sha', 'a'.repeat(40), '--staging-report', 'anything']);
  assert.equal(result.code, 1);
  assert.match(result.output, /does not exist/);
});

test('rejects an inexact approval statement', () => {
  const result = runGate(['--target', 'production', '--statement', 'deploy it', '--sha', headSha(), '--staging-report', 'x']);
  assert.equal(result.code, 1);
  assert.match(result.output, /must be exactly/);
});

test('accepts staging branch promotion approval for the current main commit', () => {
  const result = runGate([
    '--target',
    'staging-branch',
    '--statement',
    'PROMOTE APPROVED COMMIT TO STAGING BRANCH',
    '--sha',
    headSha(),
  ]);
  rmSync('docs/health-check/deployment-approval.json', { force: true });
  assert.equal(result.code, 0);
  assert.match(result.output, /Authorisation verified/);
});

test('rejects production without a staging record', () => {
  rmSync(DIR, { recursive: true, force: true });
  const result = runGate([...PROD, '--sha', headSha(), '--staging-report', 'deploy-staging-missing']);
  assert.equal(result.code, 1);
  assert.match(result.output, /No staging records exist|was not found/);
});

test('rejects a staging record for a different commit', () => {
  writeStagingRecord('deploy-staging-other', { target: 'staging', commitSha: 'b'.repeat(40), result: 'SUCCESSFUL', verification: [] });
  const result = runGate([...PROD, '--sha', headSha(), '--staging-report', 'deploy-staging-other']);
  rmSync(DIR, { recursive: true, force: true });
  assert.equal(result.code, 1);
  assert.match(result.output, /not the requested/);
});

test('rejects a failed staging record', () => {
  writeStagingRecord('deploy-staging-failed', { target: 'staging', commitSha: headSha(), result: 'FAILED', verification: [] });
  const result = runGate([...PROD, '--sha', headSha(), '--staging-report', 'deploy-staging-failed']);
  rmSync(DIR, { recursive: true, force: true });
  assert.equal(result.code, 1);
  assert.match(result.output, /requires a successful staging run/);
});

test('rejects a staging record containing a failing check', () => {
  writeStagingRecord('deploy-staging-partial', {
    target: 'staging',
    commitSha: headSha(),
    result: 'SUCCESSFUL',
    verification: [{ name: 'Stripe webhook processing', status: 'FAIL' }],
  });
  const result = runGate([...PROD, '--sha', headSha(), '--staging-report', 'deploy-staging-partial']);
  rmSync(DIR, { recursive: true, force: true });
  assert.equal(result.code, 1);
  assert.match(result.output, /failing check/);
});

test('accepts a complete, successful, matching authorisation', () => {
  writeStagingRecord('deploy-staging-good', { target: 'staging', commitSha: headSha(), result: 'SUCCESSFUL', verification: [{ name: 'Application health', status: 'PASS' }] });
  const result = runGate([...PROD, '--sha', headSha(), '--staging-report', 'deploy-staging-good']);
  rmSync(DIR, { recursive: true, force: true });
  rmSync('docs/health-check/deployment-approval.json', { force: true });
  assert.equal(result.code, 0);
  assert.match(result.output, /Authorisation verified/);
});
