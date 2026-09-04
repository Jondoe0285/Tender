import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { SERVICE_NAMES } from '../src/lib/categories';
import { UK_COUNTIES, UK_REGIONS } from '../src/lib/geography';

const DEFAULT_MEMBERSHIP_TIERS = [
  { name: 'Free', monthlyPriceGbp: 0, freeTenderOpportunitiesPerMonth: 0, description: 'Matched summaries and pay-per-tender unlocks.' },
  { name: 'Starter', monthlyPriceGbp: 29, freeTenderOpportunitiesPerMonth: 10, description: 'Suitable for small local suppliers or occasional users.' },
  { name: 'Growth', monthlyPriceGbp: 49, freeTenderOpportunitiesPerMonth: 20, description: 'Suitable for active suppliers receiving regular enquiries.' },
  { name: 'Pro', monthlyPriceGbp: 99, freeTenderOpportunitiesPerMonth: 9999, description: 'Suitable for regional suppliers or higher-volume Providers.' },
  { name: 'Enterprise', monthlyPriceGbp: 199, freeTenderOpportunitiesPerMonth: 9999, description: 'Suitable for larger businesses, multi-branch suppliers, or high-volume users.' },
] as const;

const prisma = new PrismaClient();
const DEFAULT_SANDBOX_PASSWORD = 'TradeTenderDev!2026';
const TRIAL_RETAILER_COUNT = 300;
const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
const platformOwnerPassword = process.env.PLATFORM_OWNER_PASSWORD;
const isDeployedSandbox = process.env.TRADE_TENDER_ENV === 'sandbox';
const isSandboxSeedEnabled = process.env.SANDBOX_SEED_ENABLED === 'true';

const TRIAL_RETAILER_LOCATIONS = [
  'Leeds', 'Manchester', 'Birmingham', 'Bristol', 'London', 'Liverpool', 'Newcastle', 'Nottingham',
  'Leicester', 'Hull', 'Preston', 'Milton Keynes', 'Oxford', 'Cambridge', 'Reading', 'Southampton',
  'Cardiff', 'Edinburgh', 'Glasgow', 'Belfast',
];

const TRIAL_RETAILER_COMPANY_TYPES = [
  'Building Supplies', 'Plant Hire', 'Waste Services', 'Construction Solutions', 'Site Support',
];

const INITIAL_PARTNERS = [
  {
    name: 'Sinclair Safety Solutions Ltd',
    logoPath: '/images/Sinclair%20Safety%20Solutions%20Logo.jpeg',
    destinationUrl: 'https://www.sinclairsafetysolutions.co.uk',
  },
  {
    name: 'Smart Works Civils Ltd',
    logoPath: '/images/Smart%20Works%20Civils%20Logo.png',
    destinationUrl: 'https://www.smartworkscivils.com',
  },
  {
    name: 'HSQE Consult Hub',
    logoPath: '/images/HSQE_ConsultHub_Stacked_Light.png',
    destinationUrl: null,
  },
] as const;

async function upsertRoleMembership(userId: string, role: Role) {
  await prisma.userRole.upsert({
    where: { userId_role: { userId, role } },
    update: {},
    create: { userId, role },
  });
}

function trialRetailerCoverage(index: number) {
  const coverageScope = index % 10 === 0 ? 'UK' : index % 3 === 0 ? 'REGION' : 'COUNTY';
  const location = TRIAL_RETAILER_LOCATIONS[index % TRIAL_RETAILER_LOCATIONS.length];
  const county = UK_COUNTIES[index % UK_COUNTIES.length];
  const region = UK_REGIONS[index % UK_REGIONS.length];

  return {
    coverageScope,
    coverageAreas: location,
    counties: coverageScope === 'COUNTY' ? [county, UK_COUNTIES[(index + 7) % UK_COUNTIES.length]].join(',') : '',
    regions: coverageScope === 'REGION' ? [region, UK_REGIONS[(index + 4) % UK_REGIONS.length]].join(',') : '',
  };
}

async function seedTrialRetailers(passwordHash: string) {
  for (let index = 1; index <= TRIAL_RETAILER_COUNT; index += 1) {
    const paddedIndex = String(index).padStart(3, '0');
    const services = Array.from({ length: (index % SERVICE_NAMES.length) + 1 }, (_, offset) =>
      SERVICE_NAMES[(index + offset) % SERVICE_NAMES.length]
    );
    const coverage = trialRetailerCoverage(index - 1);
    const retailer = await prisma.user.upsert({
      where: { email: `trial-retailer-${paddedIndex}@example.test` },
      update: {
        passwordHash,
        role: Role.PROVIDER,
        contactName: `Trial Retailer ${paddedIndex}`,
        contactPhone: `07700${String(index).padStart(6, '0')}`,
        suspended: false,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
      },
      create: {
        email: `trial-retailer-${paddedIndex}@example.test`,
        passwordHash,
        role: Role.PROVIDER,
        contactName: `Trial Retailer ${paddedIndex}`,
        contactPhone: `07700${String(index).padStart(6, '0')}`,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
      },
    });
    await upsertRoleMembership(retailer.id, Role.PROVIDER);
    await prisma.retailerProfile.upsert({
      where: { userId: retailer.id },
      update: {
        companyName: `${coverage.coverageAreas} ${TRIAL_RETAILER_COMPANY_TYPES[index % TRIAL_RETAILER_COMPANY_TYPES.length]} ${paddedIndex}`,
        categories: services.join(','),
        launchCreditsLeft: 3,
        ...coverage,
      },
      create: {
        userId: retailer.id,
        masterUserId: retailer.id,
        companyName: `${coverage.coverageAreas} ${TRIAL_RETAILER_COMPANY_TYPES[index % TRIAL_RETAILER_COMPANY_TYPES.length]} ${paddedIndex}`,
        categories: services.join(','),
        launchCreditsLeft: 3,
        ...coverage,
      },
    });
  }
}

async function seedInitialPartners() {
  await Promise.all(INITIAL_PARTNERS.map((partner, sortOrder) => prisma.partner.upsert({
    where: { name: partner.name },
    update: { ...partner, displayLocation: 'FOOTER', campaignSource: 'Initial partner migration', sortOrder, active: true },
    create: { ...partner, displayLocation: 'FOOTER', campaignSource: 'Initial partner migration', sortOrder, active: true },
  })));
}

async function seedDefaultMembershipTiers() {
  for (const tier of DEFAULT_MEMBERSHIP_TIERS) {
    await prisma.membershipTier.upsert({
      where: { name: tier.name },
      update: {
        description: tier.description,
        monthlyPriceGbp: tier.monthlyPriceGbp,
        freeTenderOpportunitiesPerMonth: tier.freeTenderOpportunitiesPerMonth,
        active: false,
      },
      create: {
        name: tier.name,
        description: tier.description,
        monthlyPriceGbp: tier.monthlyPriceGbp,
        freeTenderOpportunitiesPerMonth: tier.freeTenderOpportunitiesPerMonth,
        active: false,
      },
    });
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !(isDeployedSandbox && isSandboxSeedEnabled)) {
    throw new Error('Sandbox accounts may only be seeded locally or in an explicitly enabled sandbox environment.');
  }
  if (!platformOwnerEmail || !platformOwnerPassword) {
    throw new Error('PLATFORM_OWNER_EMAIL and PLATFORM_OWNER_PASSWORD are required to seed the platform owner.');
  }

  const configuredSandboxPassword = process.env.SANDBOX_USER_PASSWORD?.trim();
  const sandboxPassword = isDeployedSandbox
    ? configuredSandboxPassword
    : configuredSandboxPassword || DEFAULT_SANDBOX_PASSWORD;
  if (!sandboxPassword) {
    throw new Error('SANDBOX_USER_PASSWORD is required when seeding a deployed sandbox environment.');
  }

  const sandboxPasswordHash = await hash(sandboxPassword, 12);
  const platformOwnerPasswordHash = await hash(platformOwnerPassword, 12);
  const superUser = await prisma.user.upsert({
    where: { email: platformOwnerEmail },
    update: {
      role: Role.SUPER_USER,
      isOwner: true,
      contactName: 'Demo Super User',
      contactPhone: '07000000000',
      suspended: false,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    create: {
      email: platformOwnerEmail,
      passwordHash: platformOwnerPasswordHash,
      role: Role.SUPER_USER,
      isOwner: true,
      contactName: 'Demo Super User',
      contactPhone: '07000000000',
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await upsertRoleMembership(superUser.id, Role.SUPER_USER);

  const client = await prisma.user.upsert({
    where: { email: 'client@example.test' },
    update: {
      passwordHash: sandboxPasswordHash,
      role: Role.CONTRACTOR,
      contactName: 'Demo Client',
      contactPhone: '07123456789',
      suspended: false,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    create: {
      email: 'client@example.test',
      passwordHash: sandboxPasswordHash,
      role: Role.CONTRACTOR,
      contactName: 'Demo Client',
      contactPhone: '07123456789',
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await upsertRoleMembership(client.id, Role.CONTRACTOR);
  const clientCompany = await prisma.clientCompany.upsert({
    where: { primaryUserId: client.id },
    update: { companyName: 'Demo Construction Client Ltd' },
    create: { companyName: 'Demo Construction Client Ltd', primaryUserId: client.id },
  });
  await prisma.clientCompanyMember.upsert({
    where: { companyId_userId: { companyId: clientCompany.id, userId: client.id } },
    update: {},
    create: { companyId: clientCompany.id, userId: client.id },
  });

  const retailer = await prisma.user.upsert({
    where: { email: 'retailer@example.test' },
    update: {
      passwordHash: sandboxPasswordHash,
      role: Role.PROVIDER,
      contactName: 'Demo Retailer',
      contactPhone: '07987654321',
      suspended: false,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    create: {
      email: 'retailer@example.test',
      passwordHash: sandboxPasswordHash,
      role: Role.PROVIDER,
      contactName: 'Demo Retailer',
      contactPhone: '07987654321',
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await upsertRoleMembership(retailer.id, Role.PROVIDER);

  await prisma.retailerProfile.upsert({
    where: { userId: retailer.id },
    update: {
      companyName: 'Demo Builders Merchant Ltd',
      categories: 'Construction Materials',
      coverageAreas: 'Birmingham',
      coverageScope: 'UK',
    },
    create: {
      userId: retailer.id,
      masterUserId: retailer.id,
      companyName: 'Demo Builders Merchant Ltd',
      categories: 'Construction Materials',
      coverageAreas: 'Birmingham',
      coverageScope: 'UK',
    },
  });

  await seedTrialRetailers(sandboxPasswordHash);
  await seedInitialPartners();
  await seedDefaultMembershipTiers();

  console.log(`Seeded persistent sandbox accounts, ${TRIAL_RETAILER_COUNT} trial Retailers, ${INITIAL_PARTNERS.length} partner records, and ${DEFAULT_MEMBERSHIP_TIERS.length} inactive membership tiers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
