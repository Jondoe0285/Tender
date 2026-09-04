import { prisma } from '../src/server/data/prisma';

const INITIAL_PARTNERS = [
  { name: 'Sinclair Safety Solutions Ltd', logoPath: '/images/Sinclair%20Safety%20Solutions%20Logo.jpeg', destinationUrl: 'https://www.sinclairsafetysolutions.co.uk' },
  { name: 'Smart Works Civils Ltd', logoPath: '/images/Smart%20Works%20Civils%20Logo.png', destinationUrl: 'https://www.smartworkscivils.com' },
  { name: 'HSQE Consult Hub', logoPath: '/images/HSQE_ConsultHub_Stacked_Light.png', destinationUrl: null },
] as const;

async function main() {
  await Promise.all(INITIAL_PARTNERS.map((partner, sortOrder) => prisma.partner.upsert({
    where: { name: partner.name },
    update: { ...partner, displayLocation: 'FOOTER', campaignSource: 'Initial partner restoration', sortOrder, active: true },
    create: { ...partner, displayLocation: 'FOOTER', campaignSource: 'Initial partner restoration', sortOrder, active: true },
  })));
  console.log(`Restored ${INITIAL_PARTNERS.length} approved active partner records.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Partner restoration failed.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());