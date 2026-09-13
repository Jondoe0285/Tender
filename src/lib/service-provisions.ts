import { SERVICE_CATALOG, type ServiceName } from '@/lib/categories';

export function parseServiceProvisions(value: string | null | undefined, services: readonly string[]): string[] {
  if (!value) return [];
  const allowedServices = new Set(services);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      return parsed.filter((entry) => {
        const [service, ...provisionParts] = entry.split('::');
        const provision = provisionParts.join('::');
        const catalogue = SERVICE_CATALOG[service as ServiceName];
        return Boolean(service && provision && allowedServices.has(service) && catalogue && (provision in catalogue));
      });
    }
  } catch {
    // Legacy records used commas as separators, so reconstruct complete catalogue values below.
  }

  return services.flatMap((service) => {
    const catalogue = SERVICE_CATALOG[service as ServiceName];
    if (!catalogue) return [];
    return Object.keys(catalogue)
      .map((provision) => `${service}::${provision}`)
      .filter((entry) => value.includes(entry));
  });
}

export function serialiseServiceProvisions(values: readonly string[]): string {
  return JSON.stringify([...new Set(values)]);
}
