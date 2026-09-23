import { SERVICE_CATALOG } from '@/lib/categories';

export type CategoryCatalog = Record<string, Record<string, readonly string[]>>;

export type CategoryDefinitionInput = {
  id?: string | null;
  service: string;
  name: string;
  itemsJson?: string;
  items?: string[];
  active: boolean;
  updatedAt?: Date;
};

export function cloneCatalog(catalog: CategoryCatalog): CategoryCatalog {
  return Object.fromEntries(
    Object.entries(catalog).map(([service, categories]) => [
      service,
      Object.fromEntries(Object.entries(categories).map(([name, items]) => [name, [...items]])),
    ]),
  );
}

export function seedCatalog(): CategoryCatalog {
  return cloneCatalog(SERVICE_CATALOG);
}

export function parseCatalogItems(itemsJson: string): string[] {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string' && item.trim())) {
      return parsed.map((item) => item.trim());
    }
  } catch {
    return [];
  }
  return [];
}

/** Overlay Super User definitions onto the seed tree. Inactive families are removed from the published catalog. */
export function applyCategoryDefinitions(seed: CategoryCatalog, definitions: CategoryDefinitionInput[]): CategoryCatalog {
  const catalog = cloneCatalog(seed);
  for (const definition of definitions) {
    if (!definition.active) {
      if (catalog[definition.service]) {
        delete catalog[definition.service][definition.name];
        if (Object.keys(catalog[definition.service]).length === 0) delete catalog[definition.service];
      }
      continue;
    }
    const items = definition.items ?? (definition.itemsJson ? parseCatalogItems(definition.itemsJson) : []);
    if (!catalog[definition.service]) catalog[definition.service] = {};
    catalog[definition.service][definition.name] = items;
  }
  return catalog;
}

export function publishedCatalogVersion(definitions: Array<{ updatedAt: Date }>): string {
  if (definitions.length === 0) return 'seed';
  const latest = definitions.reduce((max, row) => (row.updatedAt > max ? row.updatedAt : max), definitions[0]!.updatedAt);
  return `${latest.toISOString()}:${definitions.length}`;
}

export function catalogServiceNames(catalog: CategoryCatalog): string[] {
  return Object.keys(catalog);
}

export function isCatalogService(catalog: CategoryCatalog, service: string): boolean {
  return Boolean(catalog[service]);
}

export function isCatalogProvision(catalog: CategoryCatalog, service: string, provision: string): boolean {
  return Boolean(catalog[service]?.[provision]);
}

export function listEditableCategories(seed: CategoryCatalog, definitions: CategoryDefinitionInput[]): Array<{
  id: string | null;
  service: string;
  name: string;
  items: string[];
  active: boolean;
}> {
  const map = new Map<string, { id: string | null; service: string; name: string; items: string[]; active: boolean }>();
  for (const [service, categories] of Object.entries(seed)) {
    for (const [name, items] of Object.entries(categories)) {
      map.set(`${service}:${name}`, { id: null, service, name, items: [...items], active: true });
    }
  }
  for (const definition of definitions) {
    const items = definition.items ?? (definition.itemsJson ? parseCatalogItems(definition.itemsJson) : []);
    map.set(`${definition.service}:${definition.name}`, {
      id: definition.id ?? null,
      service: definition.service,
      name: definition.name,
      items,
      active: definition.active,
    });
  }
  return [...map.values()].sort((left, right) => left.service.localeCompare(right.service) || left.name.localeCompare(right.name));
}
