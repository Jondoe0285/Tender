import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const tenderCount = await prisma.tender.count();
  console.log(`Seed is intentionally empty. Existing records: ${userCount} users, ${tenderCount} tenders.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
