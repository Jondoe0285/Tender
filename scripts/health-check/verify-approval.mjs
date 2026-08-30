#!/usr/bin/env node
/**
 * Verifies that a requested fix or merge is backed by a real, unresolved, approved finding in an
 * immutable archived report. Exits non-zero with an explicit reason when verification fails.
 *
 * Usage:
 *   node scripts/health-check/verify-approval.mjs \
 *     --run-id <health check run id> \
 *     --findings "HC-20260830-001,HC-20260830-002" \
 *     --scope "<approved scope>" \
 *     --statement "IMPLEMENT APPROVED FINDINGS" \
 *     --expect-statement "IMPLEMENT APPROVED FINDINGS"
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ARCHIVE_DIR = 'docs/health-check/archive';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index].replace(/^--/, '');
    args[key] = argv[index + 1] ?? '';
  }
  return args;
}

function fail(message) {
  console.error(`VERIFICATION FAILED: ${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Approval verification failed\n\n${message}\n`, { flag: 'a' });
  }
  process.exit(1);
}

function loadArchivedReports() {
  if (!existsSync(ARCHIVE_DIR)) return [];
  return readdirSync(ARCHIVE_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      try {
        return { file, data: JSON.parse(readFileSync(path.join(ARCHIVE_DIR, file), 'utf8')) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));

const expectedStatement = args['expect-statement'];
if (!expectedStatement) fail('No expected approval statement was supplied to the verifier.');
if (args.statement !== expectedStatement) {
  fail(`The approval statement must match exactly. Expected "${expectedStatement}".`);
}

const runId = (args['run-id'] ?? '').trim();
if (!runId) fail('health_check_run_id is required.');

const scope = (args.scope ?? '').trim();
if (!scope) fail('approved_scope must not be empty.');

const requestedIds = (args.findings ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (requestedIds.length === 0) fail('approved_finding_ids must contain at least one finding ID.');

const invalidFormat = requestedIds.filter((id) => !/^HC-\d{8}-\d{3}$/.test(id));
if (invalidFormat.length > 0) fail(`Malformed finding IDs: ${invalidFormat.join(', ')}. Expected the HC-YYYYMMDD-NNN format.`);

const reports = loadArchivedReports();
if (reports.length === 0) fail(`No archived health-check reports were found in ${ARCHIVE_DIR}.`);

const report = reports.find((candidate) => String(candidate.data?.context?.runId) === runId);
if (!report) {
  fail(`No archived report references health-check run ID "${runId}". Available runs: ${reports.map((candidate) => candidate.data?.context?.runId).join(', ')}`);
}

const findings = report.data.findings ?? [];
const byId = new Map(findings.map((item) => [item.id, item]));

const unknown = requestedIds.filter((id) => !byId.has(id));
if (unknown.length > 0) fail(`These finding IDs do not exist in ${report.file}: ${unknown.join(', ')}`);

const alreadyResolved = requestedIds.filter((id) => byId.get(id).lifecycle === 'Resolved');
if (alreadyResolved.length > 0) fail(`These findings are already resolved and must not be re-implemented: ${alreadyResolved.join(', ')}`);

const notActionable = requestedIds.filter((id) => byId.get(id).actionable === false);
if (notActionable.length > 0) fail(`These findings are informational and carry no authorisation block: ${notActionable.join(', ')}`);

const approved = requestedIds.map((id) => byId.get(id));
const maxRisk = approved.map((item) => item.changeRisk).join(', ');
const expectedFiles = [...new Set(approved.flatMap((item) => [...(item.expectedFiles ?? []), ...(item.affectedFiles ?? [])]))];

const result = {
  verified: true,
  reportFile: report.file,
  runId,
  actor: process.env.GITHUB_ACTOR ?? 'unknown',
  approvedFindingIds: requestedIds,
  approvedScope: scope,
  maxChangeRisk: maxRisk,
  expectedFiles,
  regressionTestsRequired: approved.map((item) => `${item.id}: ${item.regressionTestRequired}`),
  acceptanceCriteria: approved.map((item) => `${item.id}: ${item.acceptanceCriteria}`),
  validationCommands: [...new Set(approved.flatMap((item) => item.validationCommands ?? []))],
  severities: approved.map((item) => `${item.id}: ${item.severity}`),
};

writeFileSync('docs/health-check/approval-verification.json', `${JSON.stringify(result, null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, [
    `verified=true`,
    `report_file=${report.file}`,
    `branch_suffix=${requestedIds.join('-').toLowerCase()}`,
    `expected_files=${expectedFiles.join(',')}`,
  ].join('\n') + '\n', { flag: 'a' });
}

console.log(`Approval verified against ${report.file}`);
console.log(`Approved findings: ${requestedIds.join(', ')}`);
console.log(`Authorising actor: ${result.actor}`);
console.log(`Expected files: ${expectedFiles.join(', ') || '(scope-defined)'}`);
