import { SERVICE_NAMES, SUPPLYING_COMPANY_TYPE_LABELS, uniqueServicesFromStoredList, type ServiceName } from '@/lib/categories';
import { prisma } from '@/server/data/prisma';

export type RegisteredCompanyCount = {
  key: ServiceName;
  label: string;
  companies: number;
};

export type RegisteredCompanyCounts = {
  uniqueCompanies: number;
  types: RegisteredCompanyCount[];
};

/** One company is counted once per service it offers. Extra users on that company are ignored. */
export function countCompaniesByService(profiles: Array<{ categories: string }>): RegisteredCompanyCounts {
  const counts = Object.fromEntries(SERVICE_NAMES.map((name) => [name, 0])) as Record<ServiceName, number>;
  for (const profile of profiles) {
    for (const service of uniqueServicesFromStoredList(profile.categories)) {
      counts[service] += 1;
    }
  }
  return {
    uniqueCompanies: profiles.length,
    types: SERVICE_NAMES.map((key) => ({
      key,
      label: SUPPLYING_COMPANY_TYPE_LABELS[key],
      companies: counts[key],
    })),
  };
}

export async function getRegisteredCompanyCounts(): Promise<RegisteredCompanyCounts> {
  const profiles = await prisma.retailerProfile.findMany({
    where: { user: { suspended: false, role: 'USER' } },
    select: { categories: true },
  });
  return countCompaniesByService(profiles);
}
