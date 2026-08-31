#!/usr/bin/env node
/**
 * Replays the committed migration history into a disposable PostgreSQL schema and compares the
 * result with schema.prisma.
 *
 * This must run against PostgreSQL. A SQLite replay reports success for migrations written in
 * SQLite dialect, which is exactly how invalid migrations previously reached production and left
 * `Tender.supplyDate` missing.
 */
import { spawnSync } from 'node:child_process';

const VALIDATION_SCHEMA = 'health_check_migration_validation';

function resolveTargetUrl() {
  const configured = process.env.DATABASE_URL ?? '';
  let url;
  try {
    url = new URL(configured);
  } catch {
    url = null;
  }

  if (!url || (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:')) {
    console.error(
      'Migration validation requires a PostgreSQL DATABASE_URL. Replaying the history into SQLite '
        + 'cannot detect PostgreSQL dialect errors, so it would report a false pass.'
    );
    process.exit(1);
  }

  url.searchParams.set('schema', VALIDATION_SCHEMA);
  return url.toString();
}

const target = resolveTargetUrl();
const childEnv = { ...process.env, DATABASE_URL: target, DATABASE_URL_UNPOOLED: target };

function runSql(sql) {
  return spawnSync('npx', ['prisma', 'db', 'execute', '--url', target, '--stdin'], {
    input: sql,
    env: childEnv,
    stdio: ['pipe', 'ignore', 'inherit'],
  }).status;
}

function dropValidationSchema() {
  runSql(`DROP SCHEMA IF EXISTS "${VALIDATION_SCHEMA}" CASCADE;`);
}

dropValidationSchema();

const deploy = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  env: childEnv,
  stdio: ['ignore', 'ignore', 'inherit'],
});
if (deploy.status !== 0) {
  console.error('The committed migration history failed to apply to a clean PostgreSQL database.');
  dropValidationSchema();
  process.exit(deploy.status ?? 1);
}

// `--exit-code` returns 2 on drift, which must fail the check.
const diff = spawnSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-url',
    target,
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--exit-code',
  ],
  { env: childEnv, stdio: 'inherit' }
);

dropValidationSchema();

if (diff.status !== 0) {
  console.error('The applied migration history does not match prisma/schema.prisma.');
}
process.exit(diff.status ?? 1);
