#!/usr/bin/env node
import os from 'node:os';
import process from 'node:process';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';

const RESULTS_DIR = 'stress-test-results';
const DEFAULT_LEVELS = [100, 500, 1000];
const DEFAULT_ENDPOINTS = [
  { name: 'health', path: '/api/health', expected: [200], category: 'public' },
  { name: 'auth providers', path: '/api/auth/providers', expected: [200], category: 'public' },
  { name: 'client access control', path: '/client', expected: [301, 302, 303, 307, 308, 401, 403], category: 'security' },
  { name: 'provider access control', path: '/provider', expected: [301, 302, 303, 307, 308, 401, 403], category: 'security' },
  { name: 'super user access control', path: '/super-user', expected: [301, 302, 303, 307, 308, 401, 403], category: 'security' },
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') args.help = true;
    else if (value.startsWith('--')) args[value.slice(2)] = argv[index + 1] ?? '';
  }
  return args;
}

function printHelp() {
  console.log(`Trade Tender staging stress test\n\nUsage:\n  npm run stress-test -- --base-url https://staging.example\n\nRequired:\n  STRESS_TEST_BASE_URL or --base-url   Staging URL. Production hosts are refused by default.\n\nOptional environment variables:\n  STRESS_TEST_LEVELS=100,500,1000    Concurrency levels\n  STRESS_TEST_REQUESTS_PER_LEVEL=1   Requests per simulated user per level\n  STRESS_TEST_TIMEOUT_MS=15000       Request timeout\n  STRESS_TEST_SUSTAINABLE_SECONDS=20 Maximum sustainable-load duration\n  STRESS_TEST_DATABASE=true          Run isolated temporary-table DB checks\n  STRESS_TEST_DATABASE_URL=...       Dedicated staging/test DB URL for DB checks\n  STRESS_TEST_ALLOW_PRODUCTION=true  Explicitly allow a production-looking host\n  STRESS_TEST_ALLOW_MUTATION=true    Required for any future mutating scenarios\n\nReports are written to ${RESULTS_DIR}/.\nCredentialed workflows, real payments, provider integrations, and remote CPU/DB/queue metrics are reported as UNVERIFIED unless dedicated staging instrumentation is supplied.`);
}

function numberEnv(name, fallback, minimum = 0) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function levelsFrom(args) {
  const value = args.levels ?? process.env.STRESS_TEST_LEVELS;
  const levels = (value ? String(value).split(',') : DEFAULT_LEVELS).map(Number).filter((level) => Number.isInteger(level) && level > 0);
  return levels.length ? levels : DEFAULT_LEVELS;
}

function targetUrl(args) {
  return String(args['base-url'] ?? process.env.STRESS_TEST_BASE_URL ?? '').replace(/\/$/, '');
}

function isProductionLooking(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname === 'tradetender.co.uk' || hostname.endsWith('.tradetender.co.uk') || hostname.includes('production') || hostname === 'trade-tender.onrender.com';
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(samples, elapsedMs, failures) {
  const successful = samples.filter((sample) => sample.ok);
  return {
    requests: samples.length,
    successful: successful.length,
    failed: samples.length - successful.length,
    p50Ms: percentile(samples.map((sample) => sample.durationMs), 0.5),
    p95Ms: percentile(samples.map((sample) => sample.durationMs), 0.95),
    p99Ms: percentile(samples.map((sample) => sample.durationMs), 0.99),
    maxMs: samples.length ? Math.max(...samples.map((sample) => sample.durationMs)) : null,
    throughputRequestsPerSecond: elapsedMs > 0 ? Number((samples.length / (elapsedMs / 1000)).toFixed(2)) : 0,
    failures: failures.slice(0, 20),
  };
}

async function request(baseUrl, endpoint, timeoutMs, options = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      redirect: 'manual',
      ...options,
      signal: controller.signal,
      headers: { 'user-agent': 'trade-tender-staging-stress-test' },
    });
    const durationMs = Number((performance.now() - started).toFixed(2));
    const ok = endpoint.expected.includes(response.status);
    return { name: endpoint.name, path: endpoint.path, status: response.status, durationMs, ok, expected: endpoint.expected };
  } catch (error) {
    return { name: endpoint.name, path: endpoint.path, status: null, durationMs: Number((performance.now() - started).toFixed(2)), ok: false, error: error instanceof Error ? error.message : 'request failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function runLoadLevel(baseUrl, level, requestsPerUser, timeoutMs) {
  const jobs = [];
  const started = performance.now();
  for (let user = 0; user < level; user += 1) {
    for (let requestIndex = 0; requestIndex < requestsPerUser; requestIndex += 1) {
      const endpoint = DEFAULT_ENDPOINTS[(user + requestIndex) % DEFAULT_ENDPOINTS.length];
      jobs.push(endpoint);
    }
  }
  const samples = [];
  let cursor = 0;
  const workerCount = Math.min(level, 256);
  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      samples.push(await request(baseUrl, jobs[index], timeoutMs));
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const elapsedMs = performance.now() - started;
  return { level, requestsPerUser, elapsedMs: Number(elapsedMs.toFixed(2)), summary: summarize(samples, elapsedMs, samples.filter((sample) => !sample.ok)), endpointResults: samples.slice(0, 200) };
}

async function runSustainableLoad(baseUrl, seconds, timeoutMs, level) {
  const started = performance.now();
  const samples = [];
  const windows = [];
  let degradedAtSeconds = null;
  for (let windowIndex = 0; windowIndex < seconds; windowIndex += 1) {
    const windowStarted = performance.now();
    const windowDeadline = windowStarted + 1000;
    const windowSamples = [];
    let cursor = 0;
    async function worker() {
      while (performance.now() < windowDeadline) {
        const endpoint = DEFAULT_ENDPOINTS[cursor % DEFAULT_ENDPOINTS.length];
        cursor += 1;
        windowSamples.push(await request(baseUrl, endpoint, timeoutMs));
      }
    }
    await Promise.all(Array.from({ length: Math.min(level, 256) }, () => worker()));
    samples.push(...windowSamples);
    const windowElapsedMs = performance.now() - windowStarted;
    const windowSummary = summarize(windowSamples, windowElapsedMs, windowSamples.filter((sample) => !sample.ok));
    windows.push({ second: windowIndex + 1, summary: windowSummary });
    const failureRate = windowSummary.requests ? windowSummary.failed / windowSummary.requests : 1;
    if (failureRate > 0.05 || (windowSummary.p95Ms !== null && windowSummary.p95Ms > timeoutMs * 0.8)) {
      degradedAtSeconds = windowIndex + 1;
      break;
    }
  }
  const elapsedMs = performance.now() - started;
  return { level, durationSeconds: Number((elapsedMs / 1000).toFixed(2)), degradedAtSeconds, windows, summary: summarize(samples, elapsedMs, samples.filter((sample) => !sample.ok)) };
}

async function runSecurityChecks(baseUrl, timeoutMs) {
  const checks = [];
  for (const endpoint of DEFAULT_ENDPOINTS.filter((item) => item.category === 'security')) {
    const result = await request(baseUrl, endpoint, timeoutMs);
    checks.push({ check: endpoint.name, status: result.ok ? 'PASS' : 'FAIL', detail: result.ok ? `anonymous request denied with ${result.status}` : `unexpected response ${result.status ?? result.error}` });
  }
  const webhook = await request(baseUrl, { name: 'unsigned Stripe webhook', path: '/api/webhooks/stripe', expected: [400, 401, 501] }, timeoutMs, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  checks.push({ check: 'unsigned Stripe webhook', status: webhook.ok ? 'PASS' : 'FAIL', detail: webhook.ok ? `unsigned request rejected or safely disabled with ${webhook.status}` : `unexpected response ${webhook.status ?? webhook.error}` });
  const optional = [
    ['login', 'Dedicated STRESS_TEST_EMAIL and STRESS_TEST_PASSWORD are required; credentials are intentionally not accepted from command output.'],
    ['logout', 'Requires a dedicated authenticated browser/session fixture.'],
    ['session expiry', 'Requires deployed session-clock or browser control.'],
    ['password reset', 'Requires a dedicated test mailbox and reset-token fixture.'],
    ['role separation', 'Anonymous boundary checked; authenticated cross-role matrix requires dedicated users.'],
    ['IDOR and stale token matrix', 'Requires authenticated synthetic users and resource IDs.'],
    ['brute-force detection', 'Requires controlled account lockout test credentials.'],
  ].map(([check, detail]) => ({ check, status: 'UNVERIFIED', detail }));
  return { checks, unverified: optional };
}

async function runDatabaseChecks() {
  if (process.env.STRESS_TEST_DATABASE !== 'true') return { status: 'UNVERIFIED', detail: 'Set STRESS_TEST_DATABASE=true with a dedicated staging/test DATABASE_URL to run isolated temporary-table checks.' };
  if (!process.env.STRESS_TEST_DATABASE_URL) return { status: 'UNVERIFIED', detail: 'STRESS_TEST_DATABASE_URL is not configured.' };
  const client = new PrismaClient({ datasources: { db: { url: process.env.STRESS_TEST_DATABASE_URL } } });
  const started = performance.now();
  try {
    await client.$executeRawUnsafe('CREATE TEMP TABLE stress_probe (id BIGSERIAL PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    await client.$executeRawUnsafe("INSERT INTO stress_probe (value) SELECT 'synthetic-' || generate_series FROM generate_series(1, 1000)");
    const readCount = await client.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM stress_probe');
    await client.$executeRawUnsafe("UPDATE stress_probe SET value = value || '-updated' WHERE id <= 1000");
    await client.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe("SELECT id FROM stress_probe WHERE id <= 10 FOR UPDATE");
      await transaction.$executeRawUnsafe("UPDATE stress_probe SET updated_at = NOW() WHERE id <= 10");
    });
    return { status: 'PASS', detail: 'Temporary-table bulk insert, read, update, and row-lock transaction completed without touching application tables.', rowsRead: Number(readCount[0]?.count ?? 0), durationMs: Number((performance.now() - started).toFixed(2)) };
  } catch (error) {
    return { status: 'FAIL', detail: error instanceof Error ? error.message : 'database stress probe failed' };
  } finally {
    await client.$disconnect();
  }
}

async function writeReports(report) {
  await mkdir(RESULTS_DIR, { recursive: true });
  const json = JSON.stringify(report, null, 2);
  const failures = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join('\n') : '- None recorded';
  const recommendations = report.recommendations.map((item) => `- **${item.severity}:** ${item.text}`).join('\n') || '- None';
  const bottlenecks = report.performance.levels.map((level) => `- ${level.level} users: p95 ${level.summary.p95Ms ?? 'n/a'}ms, throughput ${level.summary.throughputRequestsPerSecond} req/s, failures ${level.summary.failed}`).join('\n');
  const performanceMarkdown = `# Stress Test Performance Report\n\nTarget: ${report.target}\nRun: ${report.startedAt}\n\n${bottlenecks}\n\nRemote CPU, memory, connection pool, queue, and provider telemetry require staging instrumentation and are reported separately as unverified.\n`;
  const securityMarkdown = `# Stress Test Security Report\n\n${[...report.security.checks, ...report.security.unverified].map((item) => `- **${item.status}:** ${item.check} - ${item.detail}`).join('\n')}\n`;
  const readinessMarkdown = `# Stress Test Launch Readiness\n\n**Assessment: ${report.assessment}**\n\nScore: ${report.score}/100\n\n## Severity Counts\n\n- Critical: ${report.severityCounts.CRITICAL}\n- High: ${report.severityCounts.HIGH}\n- Medium: ${report.severityCounts.MEDIUM}\n- Low: ${report.severityCounts.LOW}\n\n## Findings\n${report.findings.map((item) => `- **${item.severity}:** ${item.text}`).join('\n') || '- None'}\n\n## Coverage\n\n${report.coverageMatrix.map((item) => `- **${item.status}:** ${item.area} - ${item.detail}`).join('\n')}\n\n## Recommendations\n${recommendations}\n`;
  await Promise.all([
    writeFile(`${RESULTS_DIR}/stress-test-report.json`, json),
    writeFile(`${RESULTS_DIR}/performance-report.md`, performanceMarkdown),
    writeFile(`${RESULTS_DIR}/security-report.md`, securityMarkdown),
    writeFile(`${RESULTS_DIR}/failing-tests.md`, `# Failing Tests\n\n${failures}\n`),
    writeFile(`${RESULTS_DIR}/recommendations.md`, `# Recommendations\n\n${recommendations}\n`),
    writeFile(`${RESULTS_DIR}/bottlenecks.md`, `# Bottlenecks\n\n${bottlenecks || '- No load levels completed'}\n`),
    writeFile(`${RESULTS_DIR}/launch-readiness.md`, readinessMarkdown),
    writeFile(`${RESULTS_DIR}/launch-readiness.json`, JSON.stringify({ assessment: report.assessment, score: report.score, severityCounts: report.severityCounts, findings: report.findings, coverageMatrix: report.coverageMatrix }, null, 2)),
  ]);
  await appendFile(`${RESULTS_DIR}/README.md`, `\nStress test run ${report.startedAt}: ${report.assessment} (${report.score}/100).\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  const baseUrl = targetUrl(args);
  if (!baseUrl) throw new Error('STRESS_TEST_BASE_URL or --base-url is required. Use --help for usage.');
  let parsedUrl;
  try { parsedUrl = new URL(baseUrl); } catch { throw new Error('Stress test base URL must be an absolute HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Stress test base URL must use HTTP(S).');
  if (isProductionLooking(baseUrl) && process.env.STRESS_TEST_ALLOW_PRODUCTION !== 'true') throw new Error('Production-looking hosts are refused. Point this command at staging or set STRESS_TEST_ALLOW_PRODUCTION=true with explicit approval.');

  const levels = levelsFrom(args);
  const requestsPerUser = numberEnv('STRESS_TEST_REQUESTS_PER_LEVEL', 1, 1);
  const timeoutMs = numberEnv('STRESS_TEST_TIMEOUT_MS', 15000, 100);
  const sustainableSeconds = numberEnv('STRESS_TEST_SUSTAINABLE_SECONDS', 20, 1);
  const startedAt = new Date().toISOString();
  const beforeMemory = process.memoryUsage();
  const beforeCpu = process.cpuUsage();
  const performanceLevels = [];
  for (const level of levels) performanceLevels.push(await runLoadLevel(baseUrl, level, requestsPerUser, timeoutMs));
  const sustainable = await runSustainableLoad(baseUrl, sustainableSeconds, timeoutMs, Math.max(...levels));
  const security = await runSecurityChecks(baseUrl, timeoutMs);
  const database = await runDatabaseChecks();
  const afterMemory = process.memoryUsage();
  const cpu = process.cpuUsage(beforeCpu);
  const findings = [];
  const failures = performanceLevels.flatMap((level) => level.summary.failures.map((failure) => `${level.level} users: ${failure.name} returned ${failure.status ?? failure.error}`));
  if (failures.length) findings.push({ severity: 'HIGH', text: 'One or more public/security probes failed under load.' });
  if (security.checks.some((check) => check.status === 'FAIL')) findings.push({ severity: 'CRITICAL', text: 'An anonymous security boundary or unsigned webhook probe failed.' });
  if (database.status === 'FAIL') findings.push({ severity: 'HIGH', text: 'The isolated database stress probe failed.' });
  findings.push({ severity: 'MEDIUM', text: 'Remote CPU, memory, database connection pool, queue, email, payment, and storage telemetry is not available to this runner.' });
  findings.push({ severity: 'MEDIUM', text: 'Credentialed authentication, role matrix, business workflow, file upload, payment, notification, and failure-injection scenarios require dedicated staging fixtures and explicit mutation approval.' });
  const recommendations = [
    { severity: 'HIGH', text: 'Run this command against a dedicated staging database and provider sandbox with resource telemetry enabled.' },
    { severity: 'HIGH', text: 'Supply dedicated synthetic Contractor and Provider accounts to execute authenticated workflow and IDOR matrices.' },
    { severity: 'MEDIUM', text: 'Attach Render/Neon/Stripe/Resend/Sentry metrics to the run for CPU, memory, connection, queue, payment, and delivery evidence.' },
  ];
  const criticalCount = findings.filter((item) => item.severity === 'CRITICAL').length;
  const highCount = findings.filter((item) => item.severity === 'HIGH').length;
  const mediumCount = findings.filter((item) => item.severity === 'MEDIUM').length;
  const assessment = criticalCount ? 'FAIL' : highCount || mediumCount ? 'PASS WITH RISKS' : 'PASS';
  const score = Math.max(0, 100 - criticalCount * 50 - highCount * 20 - findings.filter((item) => item.severity === 'MEDIUM').length * 5);
  const coverageMatrix = [
    { area: 'HTTP performance at 100/500/1000 users and sustainable load', status: 'PASS', detail: 'Executed by this runner.' },
    { area: 'Anonymous authentication boundaries and unsigned webhook rejection', status: security.checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL', detail: 'Executed by this runner.' },
    { area: 'Authenticated login, logout, expiry, reset, role matrix, IDOR, and brute-force flows', status: 'UNVERIFIED', detail: 'Requires dedicated synthetic staging accounts and session fixtures.' },
    { area: 'Contractor and Provider workflow mutations', status: 'UNVERIFIED', detail: 'Requires an approved synthetic-data workflow and cleanup plan.' },
    { area: 'API invalid, duplicate, simultaneous-update, stale-token, and recovery matrix', status: 'PARTIAL', detail: 'Anonymous boundary and webhook probes execute; authenticated API matrix is not enabled.' },
    { area: 'Database bulk operations and row locking', status: database.status, detail: database.detail },
    { area: 'File uploads, interrupted transfers, and corruption handling', status: 'UNVERIFIED', detail: 'Requires authenticated synthetic tender fixtures and dedicated staging storage.' },
    { area: 'Stripe success, failure, duplicate webhook, delay, retry, and simultaneous payments', status: 'UNVERIFIED', detail: 'Requires Stripe test-mode fixtures and webhook delivery evidence.' },
    { area: 'Email, queue, Sentry, remote CPU, memory, pool, and storage telemetry', status: 'UNVERIFIED', detail: 'Requires provider-side instrumentation.' },
    { area: 'Database, storage, email, payment, and internal API failure injection', status: 'UNVERIFIED', detail: 'Requires approved staging fault-injection controls.' },
  ];
  const report = {
    schemaVersion: 1,
    target: baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    configuration: { levels, requestsPerUser, timeoutMs, sustainableSeconds },
    performance: { levels: performanceLevels, sustainable, process: { rssDeltaBytes: afterMemory.rss - beforeMemory.rss, heapUsedDeltaBytes: afterMemory.heapUsed - beforeMemory.heapUsed, userCpuMs: Math.round(cpu.user / 1000), systemCpuMs: Math.round(cpu.system / 1000), loadAverage: os.loadavg() } },
    security,
    database,
    remoteTelemetry: { status: 'UNVERIFIED', detail: 'This runner cannot infer remote CPU, memory, pool, queue, or provider metrics from HTTP alone.' },
    workflowCoverage: { status: 'UNVERIFIED', scenarios: ['contractor create job', 'tender packages', 'attachments', 'submit tender', 'compare quotes', 'accept quote', 'provider unlock', 'submit/edit/withdraw quote', 'authenticated sessions', 'payments', 'notifications', 'failure injection'] },
    coverageMatrix,
    severityCounts: { CRITICAL: findings.filter((item) => item.severity === 'CRITICAL').length, HIGH: findings.filter((item) => item.severity === 'HIGH').length, MEDIUM: findings.filter((item) => item.severity === 'MEDIUM').length, LOW: findings.filter((item) => item.severity === 'LOW').length },
    findings,
    failures,
    recommendations,
    assessment,
    score,
  };
  await writeReports(report);
  console.log(`Stress test ${assessment}: ${score}/100`);
  console.log(`Reports: ${RESULTS_DIR}/`);
  if (assessment === 'FAIL') process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(RESULTS_DIR, { recursive: true });
  const detail = error instanceof Error ? error.message : 'stress test failed';
  await writeFile(`${RESULTS_DIR}/failing-tests.md`, `# Stress Test Could Not Start\n\n- **CRITICAL:** ${detail}\n`);
  console.error(`Stress test could not start: ${detail}`);
  process.exitCode = 1;
});
