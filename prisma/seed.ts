import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const DEVELOPMENT_PASSWORD = 'TradeTenderDev!2026';
const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
const platformOwnerPassword = process.env.PLATFORM_OWNER_PASSWORD;

async function upsertRoleMembership(userId: string, role: Role) {
  await prisma.userRole.upsert({
    where: { userId_role: { userId, role } },
    update: {},
    create: { userId, role },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development accounts must not be seeded in production.');
  }
  if (!platformOwnerEmail || !platformOwnerPassword) {
    throw new Error('PLATFORM_OWNER_EMAIL and PLATFORM_OWNER_PASSWORD are required to seed the platform owner.');
  }

  const developmentPasswordHash = await hash(DEVELOPMENT_PASSWORD, 12);
  const platformOwnerPasswordHash = await hash(platformOwnerPassword, 12);
  const superUser = await prisma.user.upsert({
    where: { email: platformOwnerEmail },
    update: {
      passwordHash: platformOwnerPasswordHash,
      role: Role.SUPER_USER,
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
      passwordHash: developmentPasswordHash,
      role: Role.CLIENT,
      contactName: 'Demo Client',
      contactPhone: '07123456789',
      suspended: false,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    create: {
      email: 'client@example.test',
      passwordHash: developmentPasswordHash,
      role: Role.CLIENT,
      contactName: 'Demo Client',
      contactPhone: '07123456789',
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await upsertRoleMembership(client.id, Role.CLIENT);
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
      passwordHash: developmentPasswordHash,
      role: Role.RETAILER,
      contactName: 'Demo Retailer',
      contactPhone: '07987654321',
      suspended: false,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    create: {
      email: 'retailer@example.test',
      passwordHash: developmentPasswordHash,
      role: Role.RETAILER,
      contactName: 'Demo Retailer',
      contactPhone: '07987654321',
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });
  await upsertRoleMembership(retailer.id, Role.RETAILER);

  await prisma.retailerProfile.upsert({
    where: { userId: retailer.id },
    update: {
      companyName: 'Demo Builders Merchant Ltd',
      categories: 'Construction Materials',
      coverageAreas: 'Birmingham',
    },
    create: {
      userId: retailer.id,
      masterUserId: retailer.id,
      companyName: 'Demo Builders Merchant Ltd',
      categories: 'Construction Materials',
      coverageAreas: 'Birmingham',
    },
  });

  console.log('Seeded local Super User, Client, and Retailer development accounts.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
