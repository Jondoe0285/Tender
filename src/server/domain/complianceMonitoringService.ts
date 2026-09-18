/**
 * Detects tender-process integrity risks and attempts to bypass the platform's confidentiality
 * controls. Detection is expressed as pure functions so the thresholds stay unit-testable.
 */
import { prisma } from '@/server/data/prisma';

export type ComplianceSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplianceCategory = 'CONFIDENTIALITY' | 'TENDER_INTEGRITY' | 'PLATFORM_BYPASS' | 'PAYMENT_MISUSE';

export type ComplianceFlag = {
  id: string;
  severity: ComplianceSeverity;
  category: ComplianceCategory;
  title: string;
  detail: string;
  targetType: string;
  targetId: string;
  occurredAt: Date;
};

const severityRank: Record<ComplianceSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function sortFlags(flags: ComplianceFlag[]): ComplianceFlag[] {
  return [...flags].sort((first, second) => (
    severityRank[first.severity] - severityRank[second.severity]
    || second.occurredAt.getTime() - first.occurredAt.getTime()
  ));
}

export type ModerationSignal = {
  id: string;
  actorId: string;
  actorLabel: string;
  contentType: string;
  decision: 'ALLOW' | 'WARN' | 'BLOCK' | 'REVIEW';
  riskScore: number;
  reasons: string[];
  entityTypes: string[];
  reviewedAt: Date | null;
  createdAt: Date;
  reviewSnapshot: unknown | null;
  reviewOutcome: string | null;
  compensationCredits: number;
  compensationType: string | null;
};

const contactEntityTypes = ['EMAIL', 'PHONE', 'URL', 'DOMAIN', 'SOCIAL_HANDLE'];
const bypassEntityTypes = ['OFF_PLATFORM', 'QR_REFERENCE'];

/** Blocked or held content is a direct attempt to move a party outside the controlled workflow. */
export function flagConfidentialityAttempts(signals: ModerationSignal[]): ComplianceFlag[] {
  const actionable = signals.filter((signal) => signal.decision === 'BLOCK' || signal.decision === 'REVIEW');
  const byActor = new Map<string, ModerationSignal[]>();
  for (const signal of actionable) {
    byActor.set(signal.actorId, [...(byActor.get(signal.actorId) ?? []), signal]);
  }

  return [...byActor.entries()].map(([actorId, actorSignals]) => {
    const latest = actorSignals.reduce((newest, signal) => (signal.createdAt > newest.createdAt ? signal : newest));
    const entityTypes = new Set(actorSignals.flatMap((signal) => signal.entityTypes));
    const sharedContact = contactEntityTypes.some((type) => entityTypes.has(type));
    const attemptedBypass = bypassEntityTypes.some((type) => entityTypes.has(type));
    const unreviewed = actorSignals.filter((signal) => signal.reviewedAt === null).length;
    const repeated = actorSignals.length > 1;

    const severity: ComplianceSeverity = sharedContact || attemptedBypass || repeated ? 'HIGH' : 'MEDIUM';
    const summary = [
      sharedContact ? 'contact details' : null,
      attemptedBypass ? 'off-platform contact attempt' : null,
    ].filter(Boolean).join(' and ');

    return {
      id: `confidentiality-${actorId}`,
      severity,
      category: 'CONFIDENTIALITY' as const,
      title: `${latest.actorLabel} triggered ${actorSignals.length} confidentiality block${actorSignals.length === 1 ? '' : 's'}`,
      detail: `${summary ? `Detected ${summary}. ` : ''}${unreviewed} of ${actorSignals.length} event${actorSignals.length === 1 ? '' : 's'} awaiting Super User review. Latest: ${latest.reasons[0] ?? 'Restricted content detected'} (${latest.contentType}).`,
      targetType: 'User',
      targetId: actorId,
      occurredAt: latest.createdAt,
    };
  });
}

export type TenderSignal = {
  id: string;
  reference: string;
  clientId: string;
  category: string;
  subcategory: string;
  location: string;
  createdAt: Date;
  status?: 'DRAFT' | 'OPEN' | 'CLOSED';
};

function duplicateKey(tender: TenderSignal): string {
  return [tender.clientId, tender.category, tender.subcategory, tender.location]
    .map((part) => part.trim().toLowerCase())
    .join('|');
}

/** Re-posting the same requirement can be used to re-open a closed tender or fish for pricing. */
export function flagDuplicateTenders(tenders: TenderSignal[], windowDays = 7): ComplianceFlag[] {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const groups = new Map<string, TenderSignal[]>();
  for (const tender of tenders) {
    const key = duplicateKey(tender);
    groups.set(key, [...(groups.get(key) ?? []), tender]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime()))
    .filter((group) => group[group.length - 1].createdAt.getTime() - group[0].createdAt.getTime() <= windowMs)
    .map((group) => {
      const latest = group[group.length - 1];
      return {
        id: `duplicate-tender-${latest.id}`,
        severity: (group.length > 2 ? 'HIGH' : 'MEDIUM') as ComplianceSeverity,
        category: 'TENDER_INTEGRITY' as const,
        title: `${group.length} near-duplicate tenders for the same requirement`,
        detail: `${group.map((tender) => tender.reference).join(', ')} share the same Client, category, and location within ${windowDays} days.`,
        targetType: 'Tender',
        targetId: latest.id,
        occurredAt: latest.createdAt,
      };
    });
}

export type RetailerUnlockSignal = {
  retailerId: string;
  retailerLabel: string;
  unlockCount: number;
  quoteCount: number;
  lastUnlockAt: Date;
};

/**
 * A Retailer that repeatedly buys tender detail but rarely quotes may be harvesting Client
 * project data rather than competing for the work.
 */
export function flagUnlockWithoutQuote(
  signals: RetailerUnlockSignal[],
  { minUnlocks = 5, maxQuoteRate = 0.2 } = {}
): ComplianceFlag[] {
  return signals
    .filter((signal) => signal.unlockCount >= minUnlocks && signal.quoteCount / signal.unlockCount <= maxQuoteRate)
    .map((signal) => ({
      id: `unlock-without-quote-${signal.retailerId}`,
      severity: (signal.quoteCount === 0 ? 'HIGH' : 'MEDIUM') as ComplianceSeverity,
      category: 'PLATFORM_BYPASS' as const,
      title: `${signal.retailerLabel} unlocked ${signal.unlockCount} tenders but submitted ${signal.quoteCount}`,
      detail: `Unlocking tender detail without quoting can indicate project-data harvesting or contact being pursued away from Trade Tender. Review the unlock and message history.`,
      targetType: 'User',
      targetId: signal.retailerId,
      occurredAt: signal.lastUnlockAt,
    }));
}

export type PartyPairSignal = {
  clientId: string;
  retailerId: string;
  clientLabel: string;
  retailerLabel: string;
  interactionCount: number;
  lastActivityAt: Date;
};

/** The same Client and Provider pairing repeatedly can indicate collusion or circular tendering. */
export function flagRepeatedParties(
  signals: PartyPairSignal[],
  { minInteractions = 3 } = {}
): ComplianceFlag[] {
  return signals
    .filter((signal) => signal.interactionCount >= minInteractions)
    .map((signal) => ({
      id: `repeated-parties-${signal.clientId}-${signal.retailerId}`,
      severity: (signal.interactionCount >= 5 ? 'HIGH' : 'MEDIUM') as ComplianceSeverity,
      category: 'TENDER_INTEGRITY' as const,
      title: `${signal.clientLabel} and ${signal.retailerLabel} interacted ${signal.interactionCount} times`,
      detail: `Repeated quotes or contact releases between the same parties in the monitoring window can indicate collusion, circular tendering, or misuse of launch credits.`,
      targetType: 'User',
      targetId: signal.clientId,
      occurredAt: signal.lastActivityAt,
    }));
}

export type PaymentBehaviourSignal = {
  userId: string;
  userLabel: string;
  failedCount: number;
  reversedCount: number;
  confirmedCount: number;
  lastEventAt: Date;
};

/** Failed checkouts and reversals at volume are the launch-risk payment pattern from the business plan. */
export function flagUnusualPayments(
  signals: PaymentBehaviourSignal[],
  { minFailed = 3, minReversed = 2 } = {}
): ComplianceFlag[] {
  return signals
    .filter((signal) => signal.failedCount >= minFailed || signal.reversedCount >= minReversed || (signal.failedCount >= 2 && signal.reversedCount >= 1 && signal.confirmedCount === 0))
    .map((signal) => ({
      id: `unusual-payment-${signal.userId}`,
      severity: (signal.reversedCount >= minReversed || signal.confirmedCount === 0 ? 'HIGH' : 'MEDIUM') as ComplianceSeverity,
      category: 'PAYMENT_MISUSE' as const,
      title: `${signal.userLabel} has ${signal.failedCount} failed and ${signal.reversedCount} reversed payments`,
      detail: `Unusual payment behaviour in the monitoring window. Confirmed payments: ${signal.confirmedCount}. Review checkout failures, refunds, and chargebacks before restoring entitlements.`,
      targetType: 'User',
      targetId: signal.userId,
      occurredAt: signal.lastEventAt,
    }));
}

export type CancellationSignal = {
  clientId: string;
  clientLabel: string;
  closedTenderCount: number;
  rejectedQuoteCount: number;
  lastActivityAt: Date;
};

/** Repeated early closures and wholesale quote rejection can be used to harvest prices. */
export function flagRepeatedCancellations(
  signals: CancellationSignal[],
  { minClosedTenders = 3, minRejectedQuotes = 4 } = {}
): ComplianceFlag[] {
  return signals
    .filter((signal) => signal.closedTenderCount >= minClosedTenders || signal.rejectedQuoteCount >= minRejectedQuotes)
    .map((signal) => ({
      id: `repeated-cancellations-${signal.clientId}`,
      severity: (signal.closedTenderCount >= 5 || signal.rejectedQuoteCount >= 8 ? 'HIGH' : 'MEDIUM') as ComplianceSeverity,
      category: 'TENDER_INTEGRITY' as const,
      title: `${signal.clientLabel} closed ${signal.closedTenderCount} tenders and rejected ${signal.rejectedQuoteCount} quotes`,
      detail: `Repeated cancellations or rejections in the monitoring window can indicate price harvesting or avoidance of the accepted-quote release fee.`,
      targetType: 'User',
      targetId: signal.clientId,
      occurredAt: signal.lastActivityAt,
    }));
}

export type AccessFailureSignal = {
  userId: string;
  userLabel: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

/** Credential stuffing and account-takeover attempts show up as lockouts and repeated login failures. */
export function flagExcessiveAccessFailures(
  signals: AccessFailureSignal[],
  { minFailures = 5 } = {}
): ComplianceFlag[] {
  const now = Date.now();
  return signals
    .filter((signal) => signal.failedLoginAttempts >= minFailures || (signal.lockedUntil !== null && signal.lockedUntil.getTime() > now))
    .map((signal) => ({
      id: `access-failure-${signal.userId}`,
      severity: 'HIGH' as const,
      category: 'PLATFORM_BYPASS' as const,
      title: `${signal.userLabel} has ${signal.failedLoginAttempts} failed sign-in attempts`,
      detail: signal.lockedUntil && signal.lockedUntil.getTime() > now
        ? `Account is locked until ${signal.lockedUntil.toISOString()}. Review for credential stuffing or account takeover.`
        : `Repeated authorization failures without a current lockout. Review recent sign-in attempts.`,
      targetType: 'User',
      targetId: signal.userId,
      occurredAt: signal.lockedUntil ?? new Date(),
    }));
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getComplianceOverview(sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [moderationEvents, tenders, retailers, quotes, payments, lockedUsers] = await Promise.all([
    prisma.moderationEvent.findMany({
      where: { createdAt: { gte: since }, decision: { in: ['BLOCK', 'REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: { contactName: true, email: true, role: true } } },
    }),
    prisma.tender.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, reference: true, clientId: true, category: true, subcategory: true, location: true, createdAt: true, status: true, client: { select: { contactName: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'USER', unlocks: { some: {} } },
      select: {
        id: true,
        contactName: true,
        email: true,
        unlocks: { select: { unlockedAt: true } },
        _count: { select: { quotes: true } },
      },
    }),
    prisma.quote.findMany({
      where: { submittedAt: { gte: since } },
      orderBy: { submittedAt: 'desc' },
      take: 1000,
      select: {
        status: true,
        submittedAt: true,
        retailerId: true,
        retailer: { select: { contactName: true, email: true } },
        tender: { select: { clientId: true, client: { select: { contactName: true, email: true } } } },
        releases: { select: { releasedAt: true } },
      },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { userId: true, status: true, createdAt: true, user: { select: { contactName: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { OR: [{ failedLoginAttempts: { gte: 5 } }, { loginLockedUntil: { gt: new Date() } }] },
      select: { id: true, contactName: true, email: true, failedLoginAttempts: true, loginLockedUntil: true },
    }),
  ]);

  const signals: ModerationSignal[] = moderationEvents.map((event) => ({
    id: event.id,
    actorId: event.actorId,
    actorLabel: event.actor.contactName || event.actor.email,
    contentType: event.contentType,
    decision: event.decision,
    riskScore: event.riskScore,
    reasons: parseJsonArray(event.reasons).map(String),
    entityTypes: parseJsonArray(event.entities)
      .map((entity) => (entity as { type?: string }).type)
      .filter((type): type is string => Boolean(type)),
    reviewedAt: event.reviewedAt,
    createdAt: event.createdAt,
    reviewSnapshot: parseJsonObject(event.reviewSnapshot),
    reviewOutcome: event.reviewOutcome,
    compensationCredits: event.compensationCredits,
    compensationType: event.compensationType,
  }));

  const retailerSignals: RetailerUnlockSignal[] = retailers
    .filter((retailer) => retailer.unlocks.length > 0)
    .map((retailer) => ({
      retailerId: retailer.id,
      retailerLabel: retailer.contactName || retailer.email,
      unlockCount: retailer.unlocks.length,
      quoteCount: retailer._count.quotes,
      lastUnlockAt: retailer.unlocks.reduce((latest, unlock) => (unlock.unlockedAt > latest ? unlock.unlockedAt : latest), retailer.unlocks[0].unlockedAt),
    }));

  const partyPairs = new Map<string, PartyPairSignal>();
  for (const quote of quotes) {
    const key = `${quote.tender.clientId}|${quote.retailerId}`;
    const existing = partyPairs.get(key);
    const lastActivityAt = quote.releases[0]?.releasedAt && quote.releases[0].releasedAt > quote.submittedAt
      ? quote.releases[0].releasedAt
      : quote.submittedAt;
    if (!existing) {
      partyPairs.set(key, {
        clientId: quote.tender.clientId,
        retailerId: quote.retailerId,
        clientLabel: quote.tender.client.contactName || quote.tender.client.email,
        retailerLabel: quote.retailer.contactName || quote.retailer.email,
        interactionCount: 1,
        lastActivityAt,
      });
    } else {
      existing.interactionCount += 1;
      if (lastActivityAt > existing.lastActivityAt) existing.lastActivityAt = lastActivityAt;
    }
  }

  const paymentByUser = new Map<string, PaymentBehaviourSignal>();
  for (const payment of payments) {
    const existing = paymentByUser.get(payment.userId) ?? {
      userId: payment.userId,
      userLabel: payment.user.contactName || payment.user.email,
      failedCount: 0,
      reversedCount: 0,
      confirmedCount: 0,
      lastEventAt: payment.createdAt,
    };
    if (payment.status === 'FAILED') existing.failedCount += 1;
    if (payment.status === 'REVERSED' || payment.status === 'REFUNDED') existing.reversedCount += 1;
    if (payment.status === 'CONFIRMED') existing.confirmedCount += 1;
    if (payment.createdAt > existing.lastEventAt) existing.lastEventAt = payment.createdAt;
    paymentByUser.set(payment.userId, existing);
  }

  const cancellationByClient = new Map<string, CancellationSignal>();
  for (const tender of tenders) {
    if (tender.status !== 'CLOSED') continue;
    const existing = cancellationByClient.get(tender.clientId) ?? {
      clientId: tender.clientId,
      clientLabel: tender.client.contactName || tender.client.email,
      closedTenderCount: 0,
      rejectedQuoteCount: 0,
      lastActivityAt: tender.createdAt,
    };
    existing.closedTenderCount += 1;
    if (tender.createdAt > existing.lastActivityAt) existing.lastActivityAt = tender.createdAt;
    cancellationByClient.set(tender.clientId, existing);
  }
  for (const quote of quotes) {
    if (quote.status !== 'REJECTED') continue;
    const clientId = quote.tender.clientId;
    const existing = cancellationByClient.get(clientId) ?? {
      clientId,
      clientLabel: quote.tender.client.contactName || quote.tender.client.email,
      closedTenderCount: 0,
      rejectedQuoteCount: 0,
      lastActivityAt: quote.submittedAt,
    };
    existing.rejectedQuoteCount += 1;
    if (quote.submittedAt > existing.lastActivityAt) existing.lastActivityAt = quote.submittedAt;
    cancellationByClient.set(clientId, existing);
  }

  const flags = sortFlags([
    ...flagConfidentialityAttempts(signals),
    ...flagDuplicateTenders(tenders),
    ...flagUnlockWithoutQuote(retailerSignals),
    ...flagRepeatedParties([...partyPairs.values()]),
    ...flagUnusualPayments([...paymentByUser.values()]),
    ...flagRepeatedCancellations([...cancellationByClient.values()]),
    ...flagExcessiveAccessFailures(lockedUsers.map((user) => ({
      userId: user.id,
      userLabel: user.contactName || user.email,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.loginLockedUntil,
    }))),
  ]);

  return {
    windowDays: sinceDays,
    flags,
    moderationEvents: signals,
    counts: {
      high: flags.filter((flag) => flag.severity === 'HIGH').length,
      medium: flags.filter((flag) => flag.severity === 'MEDIUM').length,
      low: flags.filter((flag) => flag.severity === 'LOW').length,
      awaitingReview: signals.filter((signal) => signal.reviewedAt === null).length,
    },
  };
}

export type ComplianceOverview = Awaited<ReturnType<typeof getComplianceOverview>>;
