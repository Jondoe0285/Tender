import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('sole trader profiles are excluded from AI verification and shown on quotes', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const profileRoute = readFileSync('src/app/api/retailer/profile/route.ts', 'utf8');
  const verificationRoute = readFileSync('src/app/api/retailer/verification/route.ts', 'utf8');
  const quoteService = readFileSync('src/server/domain/quoteService.ts', 'utf8');

  assert.match(schema, /isSoleTrader\s+Boolean\s+@default\(false\)/);
  assert.match(profileRoute, /isSoleTrader/);
  assert.match(profileRoute, /Sole trader declaration: AI verification is not available/);
  assert.match(verificationRoute, /Sole trader profiles cannot be AI verified/);
  assert.match(quoteService, /providerIsSoleTrader/);
});

test('provider profile page explains sole trader verification impact', () => {
  const profilePage = readFileSync('src/app/retailer/profile/page.tsx', 'utf8');
  const verificationPage = readFileSync('src/app/retailer/verification/page.tsx', 'utf8');

  assert.match(profilePage, /I operate as a sole trader/);
  assert.match(profilePage, /Sole trader profiles cannot be AI verified/);
  assert.match(verificationPage, /Sole traders cannot be AI verified/);
});