import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/data/prisma';

export type ActivityLogFilters = {
  search?: string;
  action?: string;
  targetType?: string;
  actorRole?: 'SUPER_USER' | 'USER' | 'USER';
  from?: Date;
  to?: Date;
};

function asSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export function parseActivityLogFilters(searchParams: Record<string, string | string[] | undefined>): ActivityLogFilters {
  const search = asSingleValue(searchParams.search)?.trim();
  const action = asSingleValue(searchParams.action)?.trim();
  const targetType = asSingleValue(searchParams.targetType)?.trim();
  const actorRole = asSingleValue(searchParams.actorRole)?.trim();
  const fromValue = asSingleValue(searchParams.from)?.trim();
  const toValue = asSingleValue(searchParams.to)?.trim();

  return {
    search: search || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    actorRole: actorRole && ['SUPER_USER', 'USER', 'USER'].includes(actorRole) ? (actorRole as ActivityLogFilters['actorRole']) : undefined,
    from: fromValue ? new Date(`${fromValue}T00:00:00.000Z`) : undefined,
    to: toValue ? new Date(`${toValue}T23:59:59.999Z`) : undefined,
  };
}

export async function getActivityLog(filters: ActivityLogFilters = {}) {
  const where = buildActivityLogWhere(filters);

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 250,
    include: {
      actor: {
        select: {
          id: true,
          contactName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export function buildActivityLogWhere(filters: ActivityLogFilters = {}): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search } },
      { targetType: { contains: filters.search } },
      { targetId: { contains: filters.search } },
      { metadata: { contains: filters.search } },
      {
        actor: {
          OR: [
            { contactName: { contains: filters.search } },
            { email: { contains: filters.search } },
          ],
        },
      },
    ];
  }

  if (filters.action) where.action = filters.action;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.actorRole) {
    where.actor = { role: filters.actorRole };
  }
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  return where;
}

function readSessionSeconds(metadata: string | null): number {
  if (!metadata) return 0;
  try {
    const parsed = JSON.parse(metadata) as { sessionSeconds?: unknown };
    return typeof parsed.sessionSeconds === 'number' && Number.isFinite(parsed.sessionSeconds) && parsed.sessionSeconds >= 0
      ? Math.round(parsed.sessionSeconds)
      : 0;
  } catch {
    return 0;
  }
}

export async function getSuperUserActivitySummary(filters: ActivityLogFilters = {}) {
  const [superUsers, entries] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SUPER_USER' }, select: { id: true, contactName: true, email: true }, orderBy: { contactName: 'asc' } }),
    prisma.auditLog.findMany({
      where: buildActivityLogWhere({ ...filters, actorRole: 'SUPER_USER' }),
      orderBy: { createdAt: 'asc' },
      select: { actorId: true, action: true, metadata: true },
    }),
  ]);

  const summary = new Map(superUsers.map((user) => [user.id, {
    ...user,
    sessionsStarted: 0,
    sessionsCompleted: 0,
    timeOnlineSeconds: 0,
    completedActivity: 0,
  }]));

  for (const entry of entries) {
    if (!entry.actorId) continue;
    const user = summary.get(entry.actorId);
    if (!user) continue;
    if (entry.action === 'USER_LOGIN') user.sessionsStarted += 1;
    else if (entry.action === 'USER_LOGOUT') {
      user.sessionsCompleted += 1;
      user.timeOnlineSeconds += readSessionSeconds(entry.metadata);
    } else {
      user.completedActivity += 1;
    }
  }

  return Array.from(summary.values());
}
