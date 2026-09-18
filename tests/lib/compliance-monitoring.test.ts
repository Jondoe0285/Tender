import assert from 'node:assert/strict';
import test from 'node:test';
import {
  flagConfidentialityAttempts,
  flagDuplicateTenders,
  flagExcessiveAccessFailures,
  flagRepeatedCancellations,
  flagRepeatedParties,
  flagUnlockWithoutQuote,
  flagUnusualPayments,
  sortFlags,
  type ModerationSignal,
  type TenderSignal,
} from '../../src/server/domain/complianceMonitoringService';

function moderationSignal(overrides: Partial<ModerationSignal> = {}): ModerationSignal {
  return {
    id: 'event-1',
    actorId: 'retailer-1',
    actorLabel: 'Northside Materials',
    contentType: 'QUOTE_SUBMISSION',
    decision: 'BLOCK',
    riskScore: 100,
    reasons: ['Email address detected in notes'],
    entityTypes: ['EMAIL'],
    reviewedAt: null,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    ...overrides,
  };
}

function tenderSignal(overrides: Partial<TenderSignal> = {}): TenderSignal {
  return {
    id: 'tender-1',
    reference: 'TND-20260820-000001',
    clientId: 'client-1',
    category: 'Materials',
    subcategory: 'Aggregates',
    location: 'Leeds LS10 2AB',
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    ...overrides,
  };
}

test('flags shared contact details as a high-severity confidentiality risk', () => {
  const [flag] = flagConfidentialityAttempts([moderationSignal()]);

  assert.equal(flag.severity, 'HIGH');
  assert.equal(flag.category, 'CONFIDENTIALITY');
  assert.match(flag.detail, /contact details/);
  assert.match(flag.detail, /1 of 1 event awaiting/);
});

test('flags off-platform contact attempts even without direct contact details', () => {
  const [flag] = flagConfidentialityAttempts([
    moderationSignal({ entityTypes: ['OFF_PLATFORM'], reasons: ['Request to continue communication outside the platform detected'] }),
  ]);

  assert.equal(flag.severity, 'HIGH');
  assert.match(flag.detail, /off-platform contact attempt/);
});

test('groups repeated blocks by actor and ignores allowed content', () => {
  const flags = flagConfidentialityAttempts([
    moderationSignal({ id: 'event-1' }),
    moderationSignal({ id: 'event-2', createdAt: new Date('2026-08-22T10:00:00.000Z'), reviewedAt: new Date('2026-08-23T10:00:00.000Z') }),
    moderationSignal({ id: 'event-3', actorId: 'retailer-2', decision: 'ALLOW', entityTypes: [] }),
  ]);

  assert.equal(flags.length, 1);
  assert.match(flags[0].title, /2 confidentiality blocks/);
  assert.match(flags[0].detail, /1 of 2 events awaiting/);
});

test('flags near-duplicate tenders raised by the same client inside the window', () => {
  const [flag] = flagDuplicateTenders([
    tenderSignal({ id: 'tender-1', reference: 'TND-1' }),
    tenderSignal({ id: 'tender-2', reference: 'TND-2', createdAt: new Date('2026-08-23T10:00:00.000Z') }),
  ]);

  assert.equal(flag.category, 'TENDER_INTEGRITY');
  assert.equal(flag.severity, 'MEDIUM');
  assert.match(flag.detail, /TND-1, TND-2/);
});

test('does not flag repeat requirements raised outside the duplicate window', () => {
  const flags = flagDuplicateTenders([
    tenderSignal({ id: 'tender-1' }),
    tenderSignal({ id: 'tender-2', createdAt: new Date('2026-10-20T10:00:00.000Z') }),
  ]);

  assert.equal(flags.length, 0);
});

test('does not flag different requirements from the same client', () => {
  const flags = flagDuplicateTenders([
    tenderSignal({ id: 'tender-1' }),
    tenderSignal({ id: 'tender-2', subcategory: 'Bricks', createdAt: new Date('2026-08-21T10:00:00.000Z') }),
  ]);

  assert.equal(flags.length, 0);
});

test('flags retailers that unlock tender detail without quoting', () => {
  const flags = flagUnlockWithoutQuote([
    { retailerId: 'retailer-1', retailerLabel: 'Harvester Supplies', unlockCount: 8, quoteCount: 0, lastUnlockAt: new Date('2026-08-25T10:00:00.000Z') },
    { retailerId: 'retailer-2', retailerLabel: 'Active Supplies', unlockCount: 8, quoteCount: 7, lastUnlockAt: new Date('2026-08-25T10:00:00.000Z') },
    { retailerId: 'retailer-3', retailerLabel: 'New Supplier', unlockCount: 2, quoteCount: 0, lastUnlockAt: new Date('2026-08-25T10:00:00.000Z') },
  ]);

  assert.equal(flags.length, 1);
  assert.equal(flags[0].targetId, 'retailer-1');
  assert.equal(flags[0].severity, 'HIGH');
  assert.equal(flags[0].category, 'PLATFORM_BYPASS');
});

test('orders flags by severity then recency', () => {
  const ordered = sortFlags([
    { id: 'a', severity: 'LOW', category: 'TENDER_INTEGRITY', title: '', detail: '', targetType: 'Tender', targetId: 'a', occurredAt: new Date('2026-08-25T10:00:00.000Z') },
    { id: 'b', severity: 'HIGH', category: 'CONFIDENTIALITY', title: '', detail: '', targetType: 'User', targetId: 'b', occurredAt: new Date('2026-08-20T10:00:00.000Z') },
    { id: 'c', severity: 'HIGH', category: 'CONFIDENTIALITY', title: '', detail: '', targetType: 'User', targetId: 'c', occurredAt: new Date('2026-08-26T10:00:00.000Z') },
  ]);

  assert.deepEqual(ordered.map((flag) => flag.id), ['c', 'b', 'a']);
});

test('flags the same Client and Provider pairing after repeated interactions', () => {
  const flags = flagRepeatedParties([
    { clientId: 'client-1', retailerId: 'retailer-1', clientLabel: 'Northside Civils', retailerLabel: 'Harvester Supplies', interactionCount: 4, lastActivityAt: new Date('2026-08-25T10:00:00.000Z') },
    { clientId: 'client-2', retailerId: 'retailer-2', clientLabel: 'Occasional Client', retailerLabel: 'Occasional Provider', interactionCount: 1, lastActivityAt: new Date('2026-08-25T10:00:00.000Z') },
  ]);

  assert.equal(flags.length, 1);
  assert.equal(flags[0].targetId, 'client-1');
  assert.equal(flags[0].category, 'TENDER_INTEGRITY');
});

test('flags unusual failed and reversed payment behaviour', () => {
  const flags = flagUnusualPayments([
    { userId: 'user-1', userLabel: 'Failed Payer', failedCount: 4, reversedCount: 0, confirmedCount: 1, lastEventAt: new Date('2026-08-25T10:00:00.000Z') },
    { userId: 'user-2', userLabel: 'Normal Payer', failedCount: 1, reversedCount: 0, confirmedCount: 3, lastEventAt: new Date('2026-08-25T10:00:00.000Z') },
    { userId: 'user-3', userLabel: 'Chargeback Payer', failedCount: 0, reversedCount: 2, confirmedCount: 2, lastEventAt: new Date('2026-08-26T10:00:00.000Z') },
  ]);

  assert.equal(flags.length, 2);
  assert.deepEqual(new Set(flags.map((flag) => flag.targetId)), new Set(['user-1', 'user-3']));
  assert.ok(flags.every((flag) => flag.category === 'PAYMENT_MISUSE'));
});

test('flags repeated tender closures and quote rejections', () => {
  const flags = flagRepeatedCancellations([
    { clientId: 'client-1', clientLabel: 'Price Harvester', closedTenderCount: 3, rejectedQuoteCount: 1, lastActivityAt: new Date('2026-08-25T10:00:00.000Z') },
    { clientId: 'client-2', clientLabel: 'Quiet Client', closedTenderCount: 1, rejectedQuoteCount: 0, lastActivityAt: new Date('2026-08-25T10:00:00.000Z') },
  ]);

  assert.equal(flags.length, 1);
  assert.equal(flags[0].targetId, 'client-1');
});

test('flags excessive sign-in failures and active lockouts', () => {
  const flags = flagExcessiveAccessFailures([
    { userId: 'user-1', userLabel: 'Locked Account', failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 60_000) },
    { userId: 'user-2', userLabel: 'Normal Account', failedLoginAttempts: 1, lockedUntil: null },
  ]);

  assert.equal(flags.length, 1);
  assert.equal(flags[0].targetId, 'user-1');
  assert.equal(flags[0].severity, 'HIGH');
});
