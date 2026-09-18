import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const serverRoot = path.join(process.cwd(), 'src', 'server');
const apiRoot = path.join(process.cwd(), 'src', 'app', 'api');

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) return walk(fullPath);
    return fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') ? [fullPath] : [];
  });
}

test('pre-release audit metadata objects do not store email or phone fields', () => {
  const files = walk(serverRoot);
  assert.ok(files.length > 0);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('recordAuditEvent')) continue;
    assert.doesNotMatch(
      source,
      /metadata:\s*\{[^}]*(?:\bemail\b|\bcontactPhone\b|\bphone\b)\s*:/,
      `${path.relative(process.cwd(), file)} must not persist email or phone on audit metadata`
    );
  }
});

test('server and API operational logs do not print contact details', () => {
  const files = [...walk(serverRoot), ...walk(apiRoot)];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /console\.(log|info|debug)\(/, `${path.relative(process.cwd(), file)} must not use informational console logging`);
    assert.doesNotMatch(
      source,
      /console\.error\([^;]*(?:\bemail\b|\bcontactPhone\b|\.phone\b)/i,
      `${path.relative(process.cwd(), file)} must not print email or phone on console.error`
    );
  }
});
