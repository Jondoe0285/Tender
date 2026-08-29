import assert from 'node:assert/strict';
import test from 'node:test';
import { parseActivityLogFilters } from '../../src/server/domain/activityLogService';

test('parses activity log filters from query params', () => {
  const filters = parseActivityLogFilters({
    search: 'unlock',
    action: 'TENDER_UNLOCKED',
    targetType: 'TENDER',
    actorRole: 'SUPER_USER',
    from: '2026-08-01',
    to: '2026-08-31',
  });

  assert.deepEqual(filters, {
    search: 'unlock',
    action: 'TENDER_UNLOCKED',
    targetType: 'TENDER',
    actorRole: 'SUPER_USER',
    from: new Date('2026-08-01T00:00:00.000Z'),
    to: new Date('2026-08-31T23:59:59.999Z'),
  });
});
