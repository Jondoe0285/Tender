import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('mobile stress test fails closed and generates readiness reports without staging evidence', () => {
  const output = mkdtempSync(path.join(tmpdir(), 'mobile-stress-test-'));
  try {
    assert.throws(() => execFileSync('node', ['scripts/mobile/run-stress-test.mjs'], {
      env: { ...process.env, MOBILE_STRESS_RESULTS_DIR: output, ANDROID_STAGING_BASE_URL: '', IOS_STAGING_BASE_URL: '', MOBILE_STRESS_DEVICE_EVIDENCE: '' },
      stdio: 'pipe',
    }));
    assert.equal(existsSync(path.join(output, 'crash-report.json')), true);
    assert.equal(existsSync(path.join(output, 'network-resilience-report.json')), true);
    const readiness = JSON.parse(readFileSync(path.join(output, 'launch-readiness.json'), 'utf8')) as { verdict: string; findings: { severity: string }[] };
    assert.equal(readiness.verdict, 'FAIL');
    assert.equal(readiness.findings.some((finding) => finding.severity === 'CRITICAL'), true);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('production deployment depends on the mobile readiness gate', () => {
  const workflow = readFileSync('.github/workflows/deploy-production.yml', 'utf8');
  assert.match(workflow, /mobile-stress-test:/);
  assert.match(workflow, /needs: \[verify-authorisation, mobile-stress-test\]/);
  assert.match(workflow, /npm run mobile-stress-test/);
});