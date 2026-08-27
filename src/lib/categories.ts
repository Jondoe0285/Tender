export const CATEGORIES = {
  Materials: [
    'Bricks and blocks',
    'Aggregates',
    'Timber',
    'Insulation',
    'Roofing materials',
    'Plumbing and drainage materials',
    'Electrical supplies',
    'Other materials',
  ],
  Waste: ['Skip hire', 'Muck away', 'Waste collection', 'Recycling and disposal', 'Other waste services'],
  'Plant hire': [
    'Excavators',
    'Dumpers',
    'Access and scaffolding',
    'Welfare units',
    'Generators and power',
    'Other plant hire',
  ],
} as const;

export type CategoryName = keyof typeof CATEGORIES;

export const CATEGORY_NAMES = Object.keys(CATEGORIES) as CategoryName[];

export function isValidCategory(value: string): value is CategoryName {
  return CATEGORY_NAMES.includes(value as CategoryName);
}

export function isValidSubcategory(category: string, subcategory: string): boolean {
  if (!isValidCategory(category)) return false;
  return (CATEGORIES[category] as readonly string[]).includes(subcategory);
}

export const URGENCY_OPTIONS = ['standard', 'urgent', 'flexible'] as const;

export const REQUIREMENT_OPTIONS = [
  'Delivery to site required',
  'Waste transfer note required',
  'Risk assessment (RAMS) required',
  'Out-of-hours access',
] as const;

export const RETAILER_UNLOCK_FEE_GBP = 10;
export const CLIENT_RELEASE_FEE_GBP = 10;
