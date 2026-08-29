// Generates fake OPEN tenders for local demo/testing — varied services, budgets, and UK
// locations. Requires the demo Client account from `npm run db:seed` to already exist.
import { prisma } from '../src/server/data/prisma';
import { createTender } from '../src/server/domain/tenderService';
import { createTenderSchema } from '../src/lib/schemas/tender';
import { SERVICE_CATALOG, URGENCY_OPTIONS, REQUIREMENT_OPTIONS, type ServiceName } from '../src/lib/categories';
import { ContentModerationError } from '../src/server/moderation/contentModeration';

const TENDER_COUNT = 100;
const DEMO_CLIENT_EMAIL = 'client@example.test';

// Real town + postcode pairs spanning England, Scotland, Wales, and Northern Ireland, so
// generated tenders exercise every county/region coverage bucket.
const LOCATIONS = [
  'Leeds LS1 4DY', 'Manchester M1 4BT', 'Birmingham B1 1AA', 'Bristol BS1 4DJ', 'London EC1A 1BB',
  'Liverpool L1 8JQ', 'Newcastle upon Tyne NE1 4ST', 'Sheffield S1 2HE', 'Nottingham NG1 5FS',
  'Leicester LE1 6RP', 'Southampton SO14 0AA', 'Reading RG1 1JX', 'Cambridge CB2 1TN',
  'Oxford OX1 2JD', 'Bath BA1 1LZ', 'Exeter EX1 1BX', 'Plymouth PL1 2AA', 'Norwich NR1 3JD',
  'Ipswich IP1 1UE', 'Cardiff CF10 1EP', 'Swansea SA1 1DE', 'Edinburgh EH1 1RF', 'Glasgow G1 1QP',
  'Aberdeen AB10 1EY', 'Belfast BT1 1LT', 'York YO1 7HH', 'Bradford BD1 1RS', 'Hull HU1 3DZ',
  'Coventry CV1 1FY', 'Wolverhampton WV1 1LY', 'Stoke-on-Trent ST1 1RQ', 'Derby DE1 2ND',
  'Milton Keynes MK9 1BW', 'Luton LU1 2SF', 'Portsmouth PO1 2EF', 'Brighton BN1 1UG',
  'Canterbury CT1 2JX', 'Preston PR1 2HE', 'Blackpool FY1 1ES', 'Carlisle CA1 1RP',
];

const QUANTITY_UNITS = ['units', 'tonnes', 'bags', 'pallets', 'm³', 'skips', 'days', 'weeks'];

const DESCRIPTION_TEMPLATES = [
  (item: string) => `Supply and delivery required for ${item.toLowerCase()} on an active residential development. Please include lead times and minimum order quantities.`,
  (item: string) => `Ongoing commercial refurbishment project needs ${item.toLowerCase()}. Site access is available on weekdays during normal working hours.`,
  (item: string) => `Groundworks package requires ${item.toLowerCase()} for a phased construction programme. Formal quotes should include delivery charges.`,
  (item: string) => `New-build development seeking ${item.toLowerCase()} to support the current build phase. Please confirm availability and typical lead time.`,
  (item: string) => `Small extension project requires ${item.toLowerCase()}. A single delivery to site is preferred, subject to access restrictions.`,
];

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBudgetGbp(): number {
  // Weighted toward realistic construction spend while still covering every value band.
  const bands = [
    () => randomInt(150, 499),
    () => randomInt(500, 1999),
    () => randomInt(2000, 9999),
    () => randomInt(10000, 49999),
    () => randomInt(50000, 250000),
  ];
  return pick(bands)();
}

function randomQuantity(): string {
  return `${randomInt(1, 60)} ${pick(QUANTITY_UNITS)}`;
}

function randomRequirements(): (typeof REQUIREMENT_OPTIONS)[number][] {
  const shuffled = [...REQUIREMENT_OPTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, randomInt(0, 3));
}

function randomClosingDate(): Date {
  return new Date(Date.now() + randomInt(7, 45) * 24 * 60 * 60 * 1000);
}

function randomCategoryPick() {
  const services = Object.keys(SERVICE_CATALOG) as ServiceName[];
  const service = pick(services);
  const catalogue = SERVICE_CATALOG[service] as Record<string, readonly string[]>;
  const subcategory = pick(Object.keys(catalogue));
  const item = pick(catalogue[subcategory]);
  return { service, subcategory, item };
}

function buildTenderInput() {
  const primary = randomCategoryPick();
  const extraItemCount = Math.random() < 0.4 ? randomInt(1, 2) : 0;
  const extraItems = Array.from({ length: extraItemCount }, () => {
    const pickedItem = randomCategoryPick();
    return {
      category: pickedItem.service,
      subcategory: pickedItem.subcategory,
      item: pickedItem.item,
      quantity: randomQuantity(),
      description: pick(DESCRIPTION_TEMPLATES)(pickedItem.item),
    };
  });

  return createTenderSchema.parse({
    projectName: `${primary.item} — ${primary.subcategory} requirement`,
    category: primary.service,
    subcategory: primary.subcategory,
    item: primary.item,
    location: pick(LOCATIONS),
    quantity: randomQuantity(),
    urgency: pick(URGENCY_OPTIONS),
    closingDate: randomClosingDate(),
    budget: randomBudgetGbp(),
    requirements: randomRequirements(),
    description: pick(DESCRIPTION_TEMPLATES)(primary.item),
    items: extraItems.length > 0 ? extraItems : undefined,
  });
}

async function main() {
  const client = await prisma.user.findUnique({ where: { email: DEMO_CLIENT_EMAIL } });
  if (!client) {
    throw new Error(`Demo Client account (${DEMO_CLIENT_EMAIL}) not found. Run "npm run db:seed" first.`);
  }

  let created = 0;
  let skipped = 0;
  for (let index = 0; index < TENDER_COUNT; index += 1) {
    // A handful of catalog item names (e.g. "Contract lift packages") can trip the moderation
    // scan's contract-reference pattern — retry with fresh random content rather than aborting.
    const maxAttempts = 6;
    let succeeded = false;
    for (let attempt = 0; attempt < maxAttempts && !succeeded; attempt += 1) {
      try {
        await createTender(client.id, buildTenderInput());
        created += 1;
        succeeded = true;
      } catch (error) {
        if (!(error instanceof ContentModerationError)) throw error;
        if (attempt === maxAttempts - 1) skipped += 1;
      }
    }
  }

  console.log(`Created ${created} fake tender(s) for ${DEMO_CLIENT_EMAIL}${skipped > 0 ? ` (${skipped} skipped after repeated moderation flags)` : ''}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
