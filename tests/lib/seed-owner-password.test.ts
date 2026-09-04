import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('seeding does not overwrite an existing platform owner password', () => {
  const source = readFileSync(path.join(process.cwd(), 'prisma/seed.ts'), 'utf8');
  const ownerUpsert = source.slice(source.indexOf('const superUser = await prisma.user.upsert({'));
  const updateBlock = ownerUpsert.slice(ownerUpsert.indexOf('update: {'), ownerUpsert.indexOf('create: {'));

  assert.doesNotMatch(updateBlock, /passwordHash:/);
  assert.match(ownerUpsert, /create: \{\s*email: platformOwnerEmail,\s*passwordHash: platformOwnerPasswordHash,/);
});