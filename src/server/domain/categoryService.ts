import { CATEGORIES } from '@/lib/categories';
import { applyCategoryDefinitions, cloneCatalog, listEditableCategories, publishedCatalogVersion, type CategoryCatalog } from '@/lib/catalog';
import { prisma } from '@/server/data/prisma';

export type { CategoryCatalog };

export async function getPublishedCatalog(): Promise<{ version: string; catalog: CategoryCatalog }> {
  const saved = await prisma.categoryDefinition.findMany();
  return {
    version: publishedCatalogVersion(saved),
    catalog: applyCategoryDefinitions(cloneCatalog(CATEGORIES), saved),
  };
}

export async function getCategoryCatalog(): Promise<CategoryCatalog> {
  return (await getPublishedCatalog()).catalog;
}

export async function listEditableCategoryDefinitions() {
  const saved = await prisma.categoryDefinition.findMany({ orderBy: [{ service: 'asc' }, { name: 'asc' }] });
  return {
    version: publishedCatalogVersion(saved),
    categories: listEditableCategories(
      cloneCatalog(CATEGORIES),
      saved.map((category) => ({
        id: category.id,
        service: category.service,
        name: category.name,
        itemsJson: category.itemsJson,
        active: category.active,
        updatedAt: category.updatedAt,
      })),
    ),
  };
}
