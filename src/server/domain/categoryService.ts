import { CATEGORIES } from '@/lib/categories';
import { prisma } from '@/server/data/prisma';

export type CategoryCatalog = Record<string, Record<string, readonly string[]>>;

export async function getCategoryCatalog(): Promise<CategoryCatalog> {
  const catalog: CategoryCatalog = Object.fromEntries(
    Object.entries(CATEGORIES).map(([service, categories]) => [
      service,
      Object.fromEntries(Object.entries(categories).map(([name, items]) => [name, [...items]])),
    ])
  );
  const saved = await prisma.categoryDefinition.findMany({ where: { active: true } });
  for (const category of saved) {
    if (!catalog[category.service]) catalog[category.service] = {};
    catalog[category.service][category.name] = JSON.parse(category.itemsJson) as string[];
  }
  return catalog;
}
