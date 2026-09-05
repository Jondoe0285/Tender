import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('staging verification requires an explicit high-risk controls attestation', () => {
  const verifier = readFileSync('scripts/health-check/verify-deployment.mjs', 'utf8');
  const workflow = readFileSync('.github/workflows/deploy-staging.yml', 'utf8');

  assert.match(verifier, /HIGH RISK STAGING CONTROLS VERIFIED/);
  assert.match(verifier, /High-risk controls attestation/);
  assert.match(workflow, /high_risk_attestation:/);
  assert.match(workflow, /--high-risk-attestation/);
});