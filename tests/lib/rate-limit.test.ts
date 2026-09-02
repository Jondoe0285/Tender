import assert from 'node:assert/strict';
import test from 'node:test';
import { rateLimitWindow } from '../../src/server/http/rateLimit';

test('uses a stable fixed window and advances at the configured boundary', () => {
  const start = rateLimitWindow(new Date('2026-09-02T10:15:30.500Z'), 60_000);
  const next = rateLimitWindow(new Date('2026-09-02T10:16:00.000Z'), 60_000);

  assert.equal(start.startedAt.toISOString(), '2026-09-02T10:15:00.000Z');
  assert.equal(start.expiresAt.toISOString(), '2026-09-02T10:16:00.000Z');
  assert.equal(next.startedAt.toISOString(), '2026-09-02T10:16:00.000Z');
});
