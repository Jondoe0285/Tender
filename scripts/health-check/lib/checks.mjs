import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Check definitions are discovered from package.json and the repository layout rather than
 * hard-coded, so an audit never claims to have run a command this repository does not have.
 */

export const CHECK_STATUS = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  UNAVAILABLE: 'UNAVAILABLE',
  BLOCKED: 'BLOCKED',
  TIMED_OUT: 'TIMED OUT',
  NOT_APPLICABLE: 'NOT APPLICABLE',
};

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

function readPackageJson() {
  return JSON.parse(readFileSync('package.json', 'utf8'));
}

function hasScript(scripts, name) {
  return typeof scripts?.[name] === 'string';
}

function hasBinary(binary) {
  try {
    execFileSync('command', ['-v', binary], { shell: '/bin/bash', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the ordered check list. Every entry either has a runnable command or an explicit
 * reason describing why it cannot run and the risk that absence creates.
 */
export function discoverChecks({ scope = 'full' } = {}) {
  const pkg = readPackageJson();
  const scripts = pkg.scripts ?? {};
  const checks = [];

  const add = (check) => checks.push(check);

  const scriptCheck = (id, name, script, options = {}) => {
    if (hasScript(scripts, script)) {
      add({ id, name, command: ['npm', 'run', script], category: options.category ?? 'quality', critical: options.critical ?? false, timeoutMs: options.timeoutMs });
      return;
    }
    add({
      id,
      name,
      status: CHECK_STATUS.UNAVAILABLE,
      category: options.category ?? 'quality',
      critical: options.critical ?? false,
      reason: `No "${script}" script is defined in package.json.`,
      risk: options.risk ?? `${name} is not verified by the audit.`,
      correctiveAction: options.correctiveAction ?? `Add a "${script}" script or document why ${name.toLowerCase()} is not required.`,
    });
  };

  scriptCheck('build', 'Production build', 'build', { category: 'build', critical: true, risk: 'A broken production build could reach main undetected.', correctiveAction: 'Restore the build script.' });
  scriptCheck('type-check', 'Type checking', 'type-check', { category: 'quality', critical: true, risk: 'Type regressions would not be detected.' });
  scriptCheck('lint', 'Linting', 'lint', { category: 'quality', risk: 'Lint regressions would not be detected.' });
  scriptCheck('unit-tests', 'Unit tests', 'test', { category: 'test', critical: true, risk: 'Behavioural regressions would not be detected.' });

  // Formatting, integration, regression, e2e, coverage and accessibility have no repository
  // command today. They are reported as UNAVAILABLE with the risk each absence creates.
  const missingCapability = (id, name, script, risk, correctiveAction, category = 'test') => {
    if (hasScript(scripts, script)) {
      add({ id, name, command: ['npm', 'run', script], category, critical: false });
      return;
    }
    add({ id, name, status: CHECK_STATUS.UNAVAILABLE, category, reason: `No "${script}" script is defined in package.json.`, risk, correctiveAction });
  };

  missingCapability('format', 'Formatting validation', 'format:check', 'Formatting drift is not enforced automatically.', 'Add a formatter (for example Prettier) and a "format:check" script.', 'quality');
  missingCapability('integration-tests', 'Integration tests', 'test:integration', 'Payment, unlock and contact-release paths have no automated integration coverage.', 'Add integration tests against a disposable test database and a "test:integration" script.');
  missingCapability('regression-tests', 'Regression tests', 'test:regression', 'Previously fixed defects could silently reappear.', 'Add a "test:regression" script covering fixed defects.');
  missingCapability('e2e-tests', 'End-to-end tests', 'test:e2e', 'Role separation and payment-gated journeys are not verified end to end.', 'Add Playwright or Cypress and a "test:e2e" script.');
  missingCapability('coverage', 'Test coverage', 'test:coverage', 'Coverage cannot be measured, so coverage reductions cannot be detected.', 'Add a coverage runner and a "test:coverage" script.');
  missingCapability('accessibility', 'Accessibility testing', 'test:a11y', 'Accessibility regressions are not detected automatically.', 'Add automated accessibility checks and a "test:a11y" script.', 'quality');

  add({
    id: 'dependency-audit',
    name: 'Dependency vulnerability scan',
    command: ['npm', 'audit', '--audit-level=high'],
    category: 'security',
    critical: false,
  });

  if (hasBinary('gitleaks')) {
    add({ id: 'secret-scan', name: 'Secret scanning', command: ['gitleaks', 'detect', '--no-banner', '--redact'], category: 'security', critical: true });
  } else {
    add({
      id: 'secret-scan',
      name: 'Secret scanning (external tool)',
      status: CHECK_STATUS.UNAVAILABLE,
      category: 'security',
      critical: true,
      reason: 'gitleaks is not installed on the runner.',
      risk: 'Committed credentials could go undetected by a dedicated scanner.',
      correctiveAction: 'Install gitleaks in the workflow or enable GitHub secret scanning for the repository. The audit falls back to a built-in pattern scan, which is weaker.',
    });
  }

  add({
    id: 'sast',
    name: 'Static security analysis',
    status: hasBinary('semgrep') ? undefined : CHECK_STATUS.UNAVAILABLE,
    command: hasBinary('semgrep') ? ['semgrep', '--config', 'auto', '--error'] : undefined,
    category: 'security',
    reason: hasBinary('semgrep') ? undefined : 'semgrep is not installed on the runner.',
    risk: 'Code-level security weaknesses are only detected by review and the built-in pattern analysis.',
    correctiveAction: 'Enable GitHub CodeQL or add semgrep to the workflow.',
  });

  if (existsSync('prisma/schema.prisma')) {
    add({ id: 'schema-validation', name: 'Database schema validation', command: ['npx', 'prisma', 'validate'], category: 'database', critical: true });
    // Must replay against PostgreSQL: a SQLite replay passes migrations written in SQLite dialect.
    add({
      id: 'migration-validation',
      name: 'Migration validation',
      command: ['node', 'scripts/health-check/validate-migrations.mjs'],
      category: 'database',
      critical: true,
      timeoutMs: 5 * 60 * 1000,
    });
  } else {
    add({ id: 'schema-validation', name: 'Database schema validation', status: CHECK_STATUS.NOT_APPLICABLE, category: 'database', reason: 'No Prisma schema found.' });
  }

  if (hasScript(scripts, 'db:sync-prod-schema')) {
    add({ id: 'schema-drift', name: 'Production schema drift', command: ['bash', '-lc', 'npm run db:sync-prod-schema >/dev/null && git diff --exit-code -- prisma/schema.sqlserver.prisma'], category: 'database', critical: true });
  }

  missingCapability('dead-code', 'Dead-code and unused-export detection', 'lint:dead-code', 'Unused code accumulates and hides real defects.', 'Add knip or ts-prune and a "lint:dead-code" script.', 'quality');

  add({ id: 'container-validation', name: 'Container validation', status: existsSync('Dockerfile') ? undefined : CHECK_STATUS.NOT_APPLICABLE, command: existsSync('Dockerfile') ? ['docker', 'build', '--quiet', '.'] : undefined, category: 'infrastructure', reason: existsSync('Dockerfile') ? undefined : 'This repository does not build a container image.' });
  add({ id: 'infrastructure-validation', name: 'Infrastructure-as-code validation', status: CHECK_STATUS.NOT_APPLICABLE, category: 'infrastructure', reason: 'No Bicep, Terraform or ARM templates are present; Azure App Service configuration is managed outside this repository.' });

  if (scope === 'fast') {
    return checks.filter((check) => ['build', 'type-check', 'lint', 'unit-tests', 'schema-validation'].includes(check.id));
  }
  if (scope === 'security') {
    return checks.filter((check) => check.category === 'security' || check.category === 'database');
  }
  return checks;
}

function truncate(value, limit = 4000) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n… output truncated (${value.length - limit} more characters).`;
}

/** Removes values that look like credentials before any output is written to a report. */
export function sanitise(text) {
  if (!text) return '';
  let output = String(text);
  const secretEnvNames = ['RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXTAUTH_SECRET', 'RETENTION_JOB_SECRET', 'AZURE_CREDENTIALS', 'HEALTH_REPORT_FROM', 'HEALTH_REPORT_TO', 'DATABASE_URL'];
  for (const name of secretEnvNames) {
    const value = process.env[name];
    if (value && value.length > 3) output = output.split(value).join(`[redacted:${name}]`);
  }
  return output
    .replace(/\b(sk|rk|whsec|re)_[A-Za-z0-9_-]{8,}/g, '[redacted-token]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[redacted-token]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{12,}/gi, '$1[redacted-token]');
}

export function runCheck(check, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (check.status) {
    return { ...check, status: check.status, durationMs: 0, output: '' };
  }
  if (!Array.isArray(check.command) || check.command.length === 0) {
    return {
      ...check,
      status: CHECK_STATUS.BLOCKED,
      durationMs: 0,
      output: '',
      reason: check.reason ?? 'No runnable command was resolved for this check.',
      risk: check.risk ?? 'The check could not be evaluated, so its result is unknown.',
      correctiveAction: check.correctiveAction ?? 'Define a command for this check or mark it not applicable.',
    };
  }

  const started = Date.now();
  const [command, ...args] = check.command;
  try {
    const output = execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: check.timeoutMs ?? timeoutMs,
      env: { ...process.env, CI: 'true', NODE_ENV: process.env.NODE_ENV ?? 'test' },
    });
    return { ...check, status: CHECK_STATUS.PASSED, durationMs: Date.now() - started, output: truncate(sanitise(output)) };
  } catch (error) {
    const timedOut = error?.code === 'ETIMEDOUT' || error?.signal === 'SIGTERM';
    const exitCode = typeof error?.status === 'number' ? error.status : null;
    const combined = truncate(sanitise(`${error?.stdout ?? ''}\n${error?.stderr ?? ''}`.trim() || String(error?.message ?? 'Unknown error')));

    if (!timedOut && exitCode !== null && check.allowExitCodes?.includes(exitCode)) {
      return { ...check, status: CHECK_STATUS.PASSED, durationMs: Date.now() - started, output: combined, exitCode };
    }

    return {
      ...check,
      status: timedOut ? CHECK_STATUS.TIMED_OUT : CHECK_STATUS.FAILED,
      durationMs: Date.now() - started,
      exitCode,
      output: combined,
      reason: timedOut ? `Command exceeded its ${(check.timeoutMs ?? timeoutMs) / 1000}s timeout.` : undefined,
      risk: timedOut ? 'The check did not complete, so its result is unknown.' : undefined,
      correctiveAction: timedOut ? 'Re-run the audit or raise the timeout for this check.' : undefined,
    };
  }
}

export function commandLabel(check) {
  return check.command ? check.command.join(' ') : '(no command available)';
}
