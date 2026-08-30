import { z } from 'zod';
import { CATEGORIES, isValidSubcategory, URGENCY_OPTIONS, REQUIREMENT_OPTIONS } from '@/lib/categories';
import type { CategoryCatalog } from '@/server/domain/categoryService';
import { locationHasPostcode } from '@/lib/geography';

const tenderAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().nonnegative().max(10 * 1024 * 1024),
  dataBase64: z.string().min(1).max(10 * 1024 * 1024 * 4),
});

export function createTenderSchemaForCatalog(catalog: CategoryCatalog = CATEGORIES) {
  const serviceSchema = z.string().trim().refine((value) => Object.keys(catalog).some((service) => service.toLowerCase() === value.toLowerCase()), 'Select a valid service');
  const tenderItemSchema = z.object({
    category: serviceSchema,
    subcategory: z.string().trim().min(1),
    item: z.string().trim().min(1).optional(),
    quantity: z.string().trim().min(1).max(120),
    description: z.string().trim().max(4000),
  });
  const hasValidSubcategory = (service: string, category: string, item?: string) => {
    const serviceName = Object.keys(catalog).find((value) => value.toLowerCase() === service.toLowerCase());
    const categories = serviceName ? catalog[serviceName] : undefined;
    if (categories) {
      if (item !== undefined) return categories[category]?.includes(item) ?? false;
      if (categories[category]) return true;
    }
    return isValidSubcategory(service, category, item);
  };

  return z.object({
    projectName: z.string().trim().min(3).max(120),
    category: serviceSchema,
    subcategory: z.string().trim().min(1),
    item: z.string().trim().min(1).optional(),
    location: z.string().trim().min(2).max(120),
    quantity: z.string().trim().min(1).max(120),
    urgency: z.enum(URGENCY_OPTIONS),
    closingDate: z.coerce.date(),
    supplyDate: z.coerce.date().optional(),
    requirements: z.array(z.enum(REQUIREMENT_OPTIONS)).optional().default([]),
    description: z.string().trim().max(4000),
    items: z.array(tenderItemSchema).max(50).optional(),
    attachments: z.array(tenderAttachmentSchema).max(10).optional().default([]),
  })
    .refine((value) => value.item ? hasValidSubcategory(value.category, value.subcategory, value.item) : hasValidSubcategory(value.category, value.subcategory), {
      message: 'Subcategory does not belong to the selected category',
      path: ['subcategory'],
    })
    .refine((value) => locationHasPostcode(value.location), {
      message: 'Enter a valid UK postcode so delivery fees and matching companies can be determined',
      path: ['location'],
    })
    .refine((value) => value.closingDate.getTime() > Date.now(), {
      message: 'Closing date must be in the future',
      path: ['closingDate'],
    })
    .refine((value) => !value.supplyDate || value.supplyDate.getTime() > Date.now(), {
      message: 'Supply date must be in the future',
      path: ['supplyDate'],
    })
    .superRefine((value, context) => {
      value.items?.forEach((item, index) => {
        if (!hasValidSubcategory(item.category, item.subcategory, item.item)) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Subcategory does not belong to the selected category', path: ['items', index, 'subcategory'] });
        }
      });
    });
}

export const createTenderSchema = createTenderSchemaForCatalog();
export type CreateTenderInput = z.infer<typeof createTenderSchema>;
