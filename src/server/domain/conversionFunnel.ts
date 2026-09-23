import { prisma } from '@/server/data/prisma';

export async function getConversionFunnel(windowDays = 30) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const [matches, unlocks, quotes, awards, releases] = await Promise.all([
    prisma.tenderMatch.count({ where: { notifiedAt: { gte: since } } }),
    prisma.unlock.count({ where: { unlockedAt: { gte: since } } }),
    prisma.quote.count({ where: { submittedAt: { gte: since } } }),
    prisma.award.count({ where: { awardedAt: { gte: since } } }),
    prisma.contactRelease.count({ where: { releasedAt: { gte: since } } }),
  ]);
  return { windowDays, matches, unlocks, quotes, awards, releases };
}
