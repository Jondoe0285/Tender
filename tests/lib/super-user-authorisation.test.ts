import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { generateTemporaryPassword } from '../../src/server/auth/temporaryPassword';

const SUPER_USER_API_ROOT = path.join(process.cwd(), 'src/app/api/super-user');

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(entryPath);
    return entry.name === 'route.ts' ? [entryPath] : [];
  });
}

// Accountant sub-accounts hold role SUPER_USER, so requireRole('SUPER_USER') admits them.
// Every Super User route must therefore gate on requireFullSuperUser or requireOwner.
test('no Super User route authorises with the bare role check', () => {
  const offenders = routeFiles(SUPER_USER_API_ROOT).filter((file) =>
    readFileSync(file, 'utf8').includes("requireRole('SUPER_USER')")
  );

  assert.deepEqual(
    offenders.map((file) => path.relative(process.cwd(), file)),
    [],
    'These routes admit Accountant sub-accounts. Use requireFullSuperUser() or requireOwner().'
  );
});

test('every Super User route applies an authorisation guard', () => {
  const unguarded = routeFiles(SUPER_USER_API_ROOT).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return !source.includes('requireFullSuperUser')
      && !source.includes('requireOwner')
      && !source.includes("user.role !== 'SUPER_USER'");
  });

  assert.deepEqual(unguarded.map((file) => path.relative(process.cwd(), file)), []);
});

test('temporary passwords are unpredictable and correctly shaped', () => {
  const generated = new Set(Array.from({ length: 500 }, () => generateTemporaryPassword()));
  assert.equal(generated.size, 500);

  for (const password of generated) {
    assert.match(password, /^TT-[A-Z0-9_-]{8}-[A-Z0-9_-]{8}$/);
  }
});

test('no admin route derives a credential from Math.random', () => {
  const offenders = routeFiles(path.join(process.cwd(), 'src/app/api')).filter((file) =>
    readFileSync(file, 'utf8').includes('Math.random')
  );

  assert.deepEqual(offenders.map((file) => path.relative(process.cwd(), file)), []);
});
