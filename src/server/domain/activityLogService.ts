import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/data/prisma';

export type ActivityLogFilters = {
  search?: string;
  action?: string;
  targetType?: string;
  actorRole?: 'SUPER_USER' | 'CONTRACTOR' | 'PROVIDER';
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
    actorRole: actorRole && ['SUPER_USER', 'CONTRACTOR', 'PROVIDER'].includes(actorRole) ? (actorRole as ActivityLogFilters['actorRole']) : undefined,
    from: fromValue ? new Date(`${fromValue}T00:00:00.000Z`) : undefined,
    to: toValue ? new Date(`${toValue}T23:59:59.999Z`) : undefined,
  };
}

export async function getActivityLog(filters: ActivityLogFilters = {}) {
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

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 250,
    include: {
      actor: {
        select: {
          contactName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
