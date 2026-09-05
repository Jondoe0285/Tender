/**
 * Detects tender-process integrity risks and attempts to bypass the platform's confidentiality
 * controls. Detection is expressed as pure functions so the thresholds stay unit-testable.
 */
import { prisma } from '@/server/data/prisma';

export type ComplianceSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplianceCategory = 'CONFIDENTIALITY' | 'TENDER_INTEGRITY' | 'PLATFORM_BYPASS';

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

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getComplianceOverview(sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const [moderationEvents, tenders, retailers] = await Promise.all([
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
      select: { id: true, reference: true, clientId: true, category: true, subcategory: true, location: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: 'PROVIDER', unlocks: { some: {} } },
      select: {
        id: true,
        contactName: true,
        email: true,
        unlocks: { select: { unlockedAt: true } },
        _count: { select: { quotes: true } },
      },
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

  const flags = sortFlags([
    ...flagConfidentialityAttempts(signals),
    ...flagDuplicateTenders(tenders),
    ...flagUnlockWithoutQuote(retailerSignals),
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
