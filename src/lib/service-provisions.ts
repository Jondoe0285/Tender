import { SERVICE_CATALOG } from '@/lib/categories';
import { isCatalogProvision, type CategoryCatalog } from '@/lib/catalog';

function storedProvisionEntries(value: string | null | undefined): string[] | null {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) return parsed;
  } catch {
    return null;
  }
  return null;
}

/** Catalogue-validated provisions for profile and registration UI. */
export function parseServiceProvisions(
  value: string | null | undefined,
  services: readonly string[],
  catalog: CategoryCatalog = SERVICE_CATALOG,
): string[] {
  const allowedServices = new Set(services);
  const parsed = storedProvisionEntries(value);
  if (parsed) {
    return parsed.filter((entry) => {
      const [service, ...provisionParts] = entry.split('::');
      const provision = provisionParts.join('::');
      return Boolean(service && provision && allowedServices.has(service) && isCatalogProvision(catalog, service, provision));
    });
  }

  return services.flatMap((service) => {
    const provisions = catalog[service];
    if (!provisions) return [];
    return Object.keys(provisions)
      .map((provision) => `${service}::${provision}`)
      .filter((entry) => value?.includes(entry));
  });
}

/** Matching uses stored Service::Provision keys for the company's selected services, including legacy labels. */
export function parseMatchingServiceProvisions(value: string | null | undefined, services: readonly string[]): string[] {
  const allowedServices = new Set(services);
  const parsed = storedProvisionEntries(value);
  if (parsed) {
    return parsed.filter((entry) => {
      const [service, ...provisionParts] = entry.split('::');
      return Boolean(service && provisionParts.join('::') && allowedServices.has(service));
    });
  }
  return parseServiceProvisions(value, services);
}

export function serialiseServiceProvisions(values: readonly string[]): string {
  return JSON.stringify([...new Set(values)]);
}
