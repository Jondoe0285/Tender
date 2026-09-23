import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { isValidEmail } from '../src/lib/email-format';
import { passwordSchema } from '../src/lib/schemas/password';
import {
  assignMissingTradeTenderId,
  backfillMissingAwards,
  backfillMissingProjects,
  extendOpenSandboxClosingDates,
  persistNormalisedOperatingLocations,
  repairSandboxContactNames,
} from '../src/server/domain/enterpriseRecordRepair';

const prisma = new PrismaClient();
const FALLBACK_OWNER_EMAIL = 'owner@example.test';
const LOCAL_SANDBOX_PASSWORD = 'TradeTenderDev!2026';
const SANDBOX_EMAILS = [
  'client@example.test',
  'retailer@example.test',
  'demo-unverified@example.test',
  'demo-verified-ai@example.test',
  'demo-pending@example.test',
  'demo-expired@example.test',
  'demo-independent@example.test',
  'demo-rejected@example.test',
  'demo-unmatched@example.test',
];

async function main() {
  const configuredSandboxPassword = process.env.SANDBOX_USER_PASSWORD?.trim();
  const parsedSandboxPassword = configuredSandboxPassword ? passwordSchema.safeParse(configuredSandboxPassword) : null;
  const sandboxPassword = parsedSandboxPassword?.success ? parsedSandboxPassword.data : LOCAL_SANDBOX_PASSWORD;
  if (configuredSandboxPassword && !parsedSandboxPassword?.success) {
    console.log('SANDBOX_USER_PASSWORD does not meet the password policy; rehashing sandbox users to the local seed default.');
  }
  const passwordHash = await hash(sandboxPassword, 12);
  const result = await prisma.user.updateMany({
    where: { email: { in: SANDBOX_EMAILS } },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      suspended: false,
    },
  });
  console.log(`Rehashed ${result.count} sandbox users.`);

  const requestedOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() ?? '';
  const ownerEmail = isValidEmail(requestedOwnerEmail) ? requestedOwnerEmail : FALLBACK_OWNER_EMAIL;
  const ownerPassword = process.env.PLATFORM_OWNER_PASSWORD?.trim();
  if (requestedOwnerEmail && requestedOwnerEmail !== ownerEmail) {
    const stale = await prisma.user.findUnique({ where: { email: requestedOwnerEmail }, select: { id: true } });
    const taken = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
    if (stale && !taken) {
      await prisma.user.update({
        where: { id: stale.id },
        data: {
          email: ownerEmail,
          ...(ownerPassword ? { passwordHash: await hash(ownerPassword, 12) } : {}),
        },
      });
      console.log(`Moved owner account onto ${ownerEmail}.`);
    }
  } else if (ownerPassword) {
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
    if (owner) {
      await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: await hash(ownerPassword, 12) } });
    }
  }

  const confirmed = await prisma.controlChange.findFirst({
    where: { settingKey: 'CLIENT_RELEASE_FEE_MODE', status: 'CONFIRMED' },
    select: { id: true },
  });
  if (!confirmed) {
    await prisma.platformSetting.upsert({
      where: { key: 'CLIENT_RELEASE_FEE_MODE' },
      update: { value: 'FIXED' },
      create: { key: 'CLIENT_RELEASE_FEE_MODE', value: 'FIXED' },
    });
    await prisma.platformSetting.upsert({
      where: { key: 'RETAILER_UNLOCK_FEE_MODE' },
      update: { value: 'FIXED' },
      create: { key: 'RETAILER_UNLOCK_FEE_MODE', value: 'FIXED' },
    });
    console.log('Restored Year 1 fixed fee modes.');
  }

  const companies = await prisma.clientCompany.findMany({
    select: { id: true, operatingLocations: true, tradeTenderId: true, primaryUserId: true },
  });
  for (const company of companies) {
    await persistNormalisedOperatingLocations(company.id, company.operatingLocations, company.primaryUserId);
    await assignMissingTradeTenderId(company.id, company.tradeTenderId);
  }

  const clientIds = (await prisma.user.findMany({ where: { role: 'USER' }, select: { id: true } })).map((user) => user.id);
  const awards = await backfillMissingAwards(clientIds);
  const projects = await backfillMissingProjects(clientIds);
  const names = await repairSandboxContactNames();
  const dates = await extendOpenSandboxClosingDates(clientIds);
  console.log(`Backfilled ${awards} awards, ${projects} projects, ${names} contact names, and ${dates} closing dates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
