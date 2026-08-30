#!/usr/bin/env node
/** Validates workflow YAML syntax and the security invariants this system depends on. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
const problems = [];
const notes = [];

function check(condition, message) {
  if (!condition) problems.push(message);
}

/** Minimal indentation-and-structure validation; a full YAML parser is not a dependency here. */
function validateYamlShape(file, content) {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('\t')) problems.push(`${file}:${index + 1} uses a tab character; YAML requires spaces.`);
    if (/\s+$/.test(line) && line.trim() !== '') notes.push(`${file}:${index + 1} has trailing whitespace.`);
  });
  check(/^name:\s*\S/m.test(content), `${file} has no top-level name.`);
  check(/^on:/m.test(content), `${file} has no trigger block.`);
  check(/^jobs:/m.test(content), `${file} has no jobs block.`);

  // A content line inside a block scalar that is indented less than the block terminates it,
  // which turns shell text into YAML and produces a parse error.
  let blockIndent = null;
  lines.forEach((line, index) => {
    const blockStart = line.match(/^(\s*)[\w-]+:\s*[|>][-+]?\s*$/);
    if (blockStart) {
      blockIndent = blockStart[1].length;
      return;
    }
    if (blockIndent === null || line.trim() === '') return;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent <= blockIndent) {
      // The block has ended; only re-open on the next block scalar.
      blockIndent = /^(\s*)[\w-]+:\s*[|>][-+]?\s*$/.test(line) ? indent : null;
      if (indent === 0 && !/^[\w-]+:/.test(line) && !/^\s*#/.test(line)) {
        problems.push(`${file}:${index + 1} is an unindented continuation line inside a block scalar; it will break YAML parsing.`);
      }
    }
  });
}

const files = readdirSync(WORKFLOW_DIR).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
const contents = new Map(files.map((file) => [file, readFileSync(path.join(WORKFLOW_DIR, file), 'utf8')]));

const ADVISORY_ONLY = new Set();

for (const [file, content] of contents) {
  validateYamlShape(file, content);
  const record = ADVISORY_ONLY.has(file) ? (message) => notes.push(message) : (message) => problems.push(message);

  if (/^\s*schedule:/m.test(content) && !/concurrency:/.test(content)) {
    record(`${file} is scheduled but declares no concurrency group.`);
  }
  if (/^jobs:/m.test(content) && !/timeout-minutes:/.test(content)) {
    record(`${file} declares no job timeout.`);
  }
}

const healthCheck = contents.get('health-check.yml');
check(Boolean(healthCheck), 'health-check.yml is missing.');
if (healthCheck) {
  check(/permissions:\s*\n\s*contents:\s*read/.test(healthCheck), 'health-check.yml audit job must default to read-only contents permission.');
  check(/workflow_dispatch:/.test(healthCheck), 'health-check.yml must support manual dispatch.');
  check(/repository_dispatch:/.test(healthCheck), 'health-check.yml must support the Super User repository_dispatch trigger.');
  check(!/gh pr merge/.test(healthCheck), 'The audit workflow must never merge.');
  check(!/git push .*main/.test(healthCheck), 'The audit workflow must never push to main.');
}

const fixWorkflow = contents.get('approved-fix.yml');
check(Boolean(fixWorkflow), 'approved-fix.yml is missing.');
if (fixWorkflow) {
  check(/IMPLEMENT APPROVED FINDINGS/.test(fixWorkflow), 'approved-fix.yml must require the exact approval statement.');
  check(!/gh pr merge/.test(fixWorkflow), 'The fix workflow must never merge.');
  check(/--draft/.test(fixWorkflow), 'The fix workflow must open a draft pull request.');
  check(!/schedule:/.test(fixWorkflow), 'The fix workflow must not be scheduled.');
}

const mergeWorkflow = contents.get('approved-merge.yml');
check(Boolean(mergeWorkflow), 'approved-merge.yml is missing.');
if (mergeWorkflow) {
  check(/MERGE APPROVED FIXES TO MAIN/.test(mergeWorkflow), 'approved-merge.yml must require the exact approval statement.');
  const executableLines = mergeWorkflow.split('\n').filter((line) => !line.trim().startsWith('#'));
  check(!executableLines.some((line) => line.includes('--admin')), 'The merge workflow must never bypass branch protection with --admin.');
  check(!executableLines.some((line) => /push\s+.*--force/.test(line)), 'The merge workflow must never force-push.');
  check(!/azure\/webapps-deploy/.test(mergeWorkflow), 'The merge workflow must not deploy.');
}

const stagingWorkflow = contents.get('deploy-staging.yml');
check(Boolean(stagingWorkflow), 'deploy-staging.yml is missing.');
if (stagingWorkflow) {
  check(/DEPLOY APPROVED COMMIT TO STAGING/.test(stagingWorkflow), 'deploy-staging.yml must require the exact approval statement.');
  check(/verify-deployment-approval\.mjs/.test(stagingWorkflow), 'deploy-staging.yml must verify the approval before deploying.');
  check(/environment:\s*staging/.test(stagingWorkflow), 'deploy-staging.yml must deploy through the protected staging environment.');
  check(!/schedule:/.test(stagingWorkflow), 'A deployment workflow must never be scheduled.');
  check(!/secrets\.AZURE_CREDENTIALS/.test(stagingWorkflow), 'deploy-staging.yml must not use production Azure credentials.');
  check(!/secrets\.AZURE_WEBAPP_NAME/.test(stagingWorkflow), 'deploy-staging.yml must not target the production web app.');
}

const stagingPromotionWorkflow = contents.get('promote-staging-branch.yml');
check(Boolean(stagingPromotionWorkflow), 'promote-staging-branch.yml is missing.');
if (stagingPromotionWorkflow) {
  check(/PROMOTE APPROVED COMMIT TO STAGING BRANCH/.test(stagingPromotionWorkflow), 'promote-staging-branch.yml must require the exact approval statement.');
  check(/verify-deployment-approval\.mjs/.test(stagingPromotionWorkflow), 'promote-staging-branch.yml must verify the approval before promoting.');
  check(/refs\/heads\/staging/.test(stagingPromotionWorkflow), 'promote-staging-branch.yml must update the permanent staging branch.');
  check(/environment:\s*staging/.test(stagingPromotionWorkflow), 'promote-staging-branch.yml must use the protected staging environment.');
  check(!/azure\/webapps-deploy/.test(stagingPromotionWorkflow), 'promote-staging-branch.yml must not deploy.');
  check(!/schedule:/.test(stagingPromotionWorkflow), 'Staging branch promotion must not be scheduled.');
}

const productionWorkflow = contents.get('deploy-production.yml');
check(Boolean(productionWorkflow), 'deploy-production.yml is missing.');
if (productionWorkflow) {
  check(/DEPLOY APPROVED COMMIT TO PRODUCTION/.test(productionWorkflow), 'deploy-production.yml must require the exact approval statement.');
  check(/verify-deployment-approval\.mjs/.test(productionWorkflow), 'deploy-production.yml must verify the approval before deploying.');
  check(/--staging-report/.test(productionWorkflow), 'deploy-production.yml must require a staging record.');
  check(/environment:\s*production/.test(productionWorkflow), 'deploy-production.yml must deploy through the protected production environment.');
  check(/verify-deployment\.mjs/.test(productionWorkflow), 'deploy-production.yml must verify the deployment afterwards.');
  check(/rollback/i.test(productionWorkflow), 'deploy-production.yml must define a rollback path.');
  check(!/schedule:/.test(productionWorkflow), 'A deployment workflow must never be scheduled.');
  check(!/\bpush:/.test(productionWorkflow), 'deploy-production.yml must not deploy automatically on push.');
}

// Merging to main must never be the same action as releasing to production.
for (const [file, content] of contents) {
  if (!/azure\/webapps-deploy/.test(content)) continue;
  const trigger = content.split(/^jobs:/m)[0];
  if (/^\s*push:/m.test(trigger) && /branches:\s*\[\s*main\s*\]/.test(trigger)) {
    problems.push(`${file} deploys automatically on push to main; a release must require explicit approval.`);
  }
}

// The secrets context is unavailable in a job-level if, so such a guard silently does nothing.
for (const [file, content] of contents) {
  content.split('\n').forEach((line, index) => {
    if (/^\s*if:.*secrets\./.test(line)) {
      problems.push(`${file}:${index + 1} uses the secrets context in an "if:" condition, which GitHub does not evaluate.`);
    }
  });
}

// One authoritative scheduled audit only.
const scheduled = [...contents.entries()].filter(([, content]) => /^\s*schedule:/m.test(content)).map(([file]) => file);
const auditSchedules = scheduled.filter((file) => file !== 'quote-retention.yml');
check(auditSchedules.length <= 1, `More than one scheduled audit workflow is enabled: ${auditSchedules.join(', ')}. Exactly one authoritative audit schedule is permitted.`);

if (problems.length > 0) {
  console.error('Workflow validation failed:\n');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log(`Validated ${files.length} workflow files.`);
console.log(`Scheduled workflows: ${scheduled.join(', ') || 'none'}`);
for (const note of notes.slice(0, 10)) console.log(`  note: ${note}`);
