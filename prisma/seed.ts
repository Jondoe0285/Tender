import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth/password';
import { buildTenderReference } from '../src/lib/identifiers';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';

async function ensureUser(params: {
  email: string;
  role: 'SUPER_USER' | 'CLIENT' | 'RETAILER';
  contactName: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) return existing;

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash: await hashPassword(params.password),
      role: params.role,
      contactName: params.contactName,
      termsAcceptedAt: new Date(),
    },
  });
  console.log(`Seeded ${params.role}: ${params.email} / ${params.password}`);
  return user;
}

async function main() {
  await ensureUser({
    email: 'admin@tradetender.test',
    role: 'SUPER_USER',
    contactName: 'Trade Tender Admin',
    password: 'ChangeMe123!',
  });

  const client = await ensureUser({
    email: 'demo.client@tradetender.test',
    role: 'CLIENT',
    contactName: 'Casey Client',
    password: DEMO_PASSWORD,
  });

  const materialsRetailer = await ensureUser({
    email: 'demo.retailer.materials@tradetender.test',
    role: 'RETAILER',
    contactName: 'Rory Retailer',
    password: DEMO_PASSWORD,
  });
  if (!(await prisma.retailerProfile.findUnique({ where: { userId: materialsRetailer.id } }))) {
    await prisma.retailerProfile.create({
      data: {
        userId: materialsRetailer.id,
        companyName: 'Northern Builders Merchants Ltd',
        categories: 'Materials,Waste',
        coverageAreas: 'Leeds, Manchester, Sheffield',
      },
    });
  }

  const plantRetailer = await ensureUser({
    email: 'demo.retailer.plant@tradetender.test',
    role: 'RETAILER',
    contactName: 'Priya Plant',
    password: DEMO_PASSWORD,
  });
  if (!(await prisma.retailerProfile.findUnique({ where: { userId: plantRetailer.id } }))) {
    await prisma.retailerProfile.create({
      data: {
        userId: plantRetailer.id,
        companyName: 'Pennine Plant Hire Ltd',
        categories: 'Plant hire',
        coverageAreas: 'Leeds, York',
      },
    });
  }

  const existingDemoTender = await prisma.tender.findFirst({ where: { clientId: client.id } });
  if (!existingDemoTender) {
    const tender = await prisma.tender.create({
      data: {
        reference: buildTenderReference(new Date(), 1),
        clientId: client.id,
        category: 'Materials',
        subcategory: 'Bricks and blocks',
        location: 'Leeds',
        quantity: '4,000 facing bricks',
        urgency: 'standard',
        closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budget: 2000,
        requirements: 'Delivery to site required',
        description: 'Facing bricks needed for a side extension. Delivery within 3 weeks preferred.',
        status: 'OPEN',
      },
    });
    await prisma.tenderMatch.create({ data: { tenderId: tender.id, retailerId: materialsRetailer.id } });
    console.log(`Seeded demo tender: ${tender.reference}`);
  }

  console.log('\nDemo accounts ready — see README.md "Demo accounts" section for the full list.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
