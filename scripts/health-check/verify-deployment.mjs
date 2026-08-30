#!/usr/bin/env node
/**
 * Non-destructive post-deployment verification.
 *
 * Every check is read-only: no test tender, quote, payment or account is created, and no
 * production record is mutated. Checks that cannot be proven from outside the application are
 * reported as UNVERIFIED rather than being assumed to pass.
 *
 * Usage:
 *   node scripts/health-check/verify-deployment.mjs --base-url https://... --target staging
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const args = {};
for (let index = 2; index < process.argv.length; index += 2) {
  args[process.argv[index].replace(/^--/, '')] = process.argv[index + 1] ?? '';
}

const baseUrl = (args['base-url'] ?? '').replace(/\/$/, '');
const target = args.target ?? 'staging';
const commitSha = args.sha ?? 'unknown';

if (!baseUrl || /^\[.*\]$/.test(baseUrl)) {
  console.error('VERIFICATION FAILED: --base-url is required and must not be a placeholder.');
  process.exit(1);
}

const results = [];
const TIMEOUT_MS = 15000;

function record(name, status, detail) {
  results.push({ name, status, detail });
  const mark = { PASS: '\u2713', FAIL: '\u2717', UNVERIFIED: '?' }[status];
  console.log(`  ${mark} ${name}: ${detail}`);
}

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'trade-tender-deployment-verifier' },
      ...options,
    });
    return { ok: true, status: response.status, response };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'request failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A protected page must redirect an unauthenticated caller to sign-in.
 * 404 is treated as a failure: a mistyped path also returns 404, which would otherwise
 * report a route as protected when it was never reached at all.
 */
async function expectProtectedPage(name, pathname) {
  const result = await request(pathname);
  if (!result.ok) return record(name, 'FAIL', `unreachable (${result.error})`);
  if (result.status === 200) return record(name, 'FAIL', 'returned 200 without authentication; the route is not protected');
  if ([301, 302, 303, 307, 308].includes(result.status)) {
    return record(name, 'PASS', `redirected an unauthenticated caller (${result.status})`);
  }
  if ([401, 403].includes(result.status)) return record(name, 'PASS', `denied unauthenticated access (${result.status})`);
  if (result.status === 404) return record(name, 'FAIL', 'route not found; the expected page is missing from this deployment');
  record(name, 'UNVERIFIED', `unexpected status ${result.status}`);
}

/** A protected API route must reject an unauthenticated caller without returning data. */
async function expectProtectedApi(name, pathname, method = 'GET') {
  const result = await request(pathname, method === 'GET' ? {} : { method, headers: { 'content-type': 'application/json' }, body: '{}' });
  if (!result.ok) return record(name, 'FAIL', `unreachable (${result.error})`);
  if (result.status === 200) return record(name, 'FAIL', 'returned 200 without authentication; the endpoint is not protected');
  if ([401, 403].includes(result.status)) return record(name, 'PASS', `denied unauthenticated access (${result.status})`);
  if ([301, 302, 303, 307, 308].includes(result.status)) return record(name, 'PASS', `redirected an unauthenticated caller (${result.status})`);
  if (result.status === 404) return record(name, 'FAIL', 'endpoint not found; it is missing from this deployment');
  if (result.status === 400 || result.status === 422) {
    return record(name, 'FAIL', `rejected on payload (${result.status}) before authentication; authentication must be checked first`);
  }
  record(name, 'UNVERIFIED', `unexpected status ${result.status}`);
}

console.log(`Verifying ${target} deployment at ${baseUrl}`);
console.log(`Commit: ${commitSha}\n`);

// Application health and database connectivity.
const health = await request('/api/health');
if (!health.ok) {
  record('Application health', 'FAIL', `health endpoint unreachable (${health.error})`);
  record('Database connectivity', 'FAIL', 'not evaluable without the health endpoint');
} else {
  let body = null;
  try {
    body = await health.response.json();
  } catch {
    /* handled below */
  }
  body?.status === 'ok'
    ? record('Application health', 'PASS', `status ok in ${body.latencyMs}ms`)
    : record('Application health', 'FAIL', `status ${health.status}, body ${JSON.stringify(body)}`);
  body?.database === 'ok'
    ? record('Database connectivity', 'PASS', 'database reachable')
    : record('Database connectivity', 'FAIL', `database reported "${body?.database ?? 'unknown'}"`);
}

// Authentication surface.
const signIn = await request('/api/auth/providers');
signIn.ok && signIn.status === 200
  ? record('Authentication', 'PASS', 'auth provider endpoint responding')
  : record('Authentication', 'FAIL', signIn.ok ? `status ${signIn.status}` : signIn.error);

// Role-based access control: each portal must reject anonymous callers.
await expectProtectedPage('Client access control', '/client');
await expectProtectedPage('Retailer access control', '/retailer');
await expectProtectedPage('Super User access control', '/super-user');

// Business endpoints. A probe id is used so no real record is addressed, and no method
// used here creates, alters or deletes anything.
const PROBE_ID = 'deployment-probe-nonexistent';
await expectProtectedApi('Tender creation', '/api/tenders');
await expectProtectedApi('Tender unlocking', `/api/tenders/${PROBE_ID}/unlock`, 'POST');
await expectProtectedApi('Quote submission', `/api/tenders/${PROBE_ID}/quotes`);
await expectProtectedApi('Quote acceptance', `/api/quotes/${PROBE_ID}/accept`, 'POST');
await expectProtectedApi('Contact-release controls', `/api/quotes/${PROBE_ID}/release/status`);
await expectProtectedApi('Payment endpoints', `/api/tenders/${PROBE_ID}/unlock/finalize`, 'POST');
await expectProtectedApi('Super User settings', '/api/super-user/settings');

// Stripe webhook must reject an unsigned payload without creating anything.
const webhook = await request('/api/webhooks/stripe', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ probe: true }),
});
if (!webhook.ok) {
  record('Stripe webhook processing', 'FAIL', `unreachable (${webhook.error})`);
} else if (webhook.status === 400 || webhook.status === 401) {
  record('Stripe webhook processing', 'PASS', `rejected an unsigned payload (${webhook.status})`);
} else if (webhook.status === 501) {
  record('Stripe webhook processing', target === 'production' ? 'FAIL' : 'UNVERIFIED', 'Stripe is not configured at this target');
} else {
  record('Stripe webhook processing', 'FAIL', `accepted or mishandled an unsigned payload (${webhook.status})`);
}

// Checks that cannot be proven from outside the application boundary.
record('Resend delivery', 'UNVERIFIED', 'requires a provider-side delivery check; not provable by probe');
record('Audit logging', 'UNVERIFIED', 'requires database inspection; not provable by unauthenticated probe');
record('Error rates', 'UNVERIFIED', 'requires an observability platform; none is configured');

const failed = results.filter((entry) => entry.status === 'FAIL');
const unverified = results.filter((entry) => entry.status === 'UNVERIFIED');
const outcome = failed.length === 0 ? 'SUCCESSFUL' : 'FAILED';

const record_ = {
  target,
  commitSha,
  baseUrl,
  result: outcome,
  deployedAt: new Date().toISOString(),
  actor: process.env.GITHUB_ACTOR ?? 'unknown',
  workflowRunId: process.env.GITHUB_RUN_ID ?? 'local',
  passed: results.filter((entry) => entry.status === 'PASS').length,
  failed: failed.length,
  unverified: unverified.length,
  verification: results,
};

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const id = `deploy-${target}-${stamp}-UTC`;
mkdirSync('docs/health-check/deployments', { recursive: true });
writeFileSync(`docs/health-check/deployments/${id}.json`, `${JSON.stringify(record_, null, 2)}\n`);

console.log(`\n${outcome}: ${record_.passed} passed, ${failed.length} failed, ${unverified.length} unverified`);
console.log(`Record: docs/health-check/deployments/${id}.json`);

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, [`result=${outcome}`, `record_id=${id}`, `failed=${failed.length}`].join('\n') + '\n', { flag: 'a' });
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    `## ${target.toUpperCase()} DEPLOYMENT ${outcome}`,
    '',
    `- Commit: \`${commitSha}\``,
    `- Actor: @${record_.actor}`,
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...results.map((entry) => `| ${entry.name} | ${entry.status} | ${entry.detail} |`),
    '',
  ].join('\n');
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
}

if (failed.length > 0) process.exit(1);
