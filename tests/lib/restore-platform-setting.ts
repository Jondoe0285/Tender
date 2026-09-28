import { prisma } from '../../src/server/data/prisma';

/** Restore by key so parallel tests that delete and recreate the row cannot fail cleanup on a stale id. */
export async function restorePlatformSetting(key: string, original: { value: string } | null) {
  if (original) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: original.value },
      create: { key, value: original.value },
    });
    return;
  }
  await prisma.platformSetting.deleteMany({ where: { key } });
}
