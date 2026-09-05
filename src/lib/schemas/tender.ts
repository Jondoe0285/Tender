import { z } from 'zod';
import { CATEGORIES, isValidSubcategory, URGENCY_OPTIONS, REQUIREMENT_OPTIONS } from '@/lib/categories';
import type { CategoryCatalog } from '@/server/domain/categoryService';
import { locationHasPostcode } from '@/lib/geography';
import { MAX_TENDER_ATTACHMENT_TOTAL_BYTES, verifyTenderAttachment } from '@/lib/attachment-utils';

const tenderAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().nonnegative(),
  dataBase64: z.string().min(1).max(Math.ceil((10 * 1024 * 1024) * 4 / 3) + 4),
}).transform((attachment, context) => {
  try {
    return { ...attachment, ...verifyTenderAttachment(attachment) };
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Attachment is invalid',
      path: ['dataBase64'],
    });
    return z.NEVER;
  }
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
    itemDescription: z.string().trim().max(4000).optional().default(''),
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
      const attachmentBytes = value.attachments.reduce((total, attachment) => total + attachment.sizeBytes, 0);
      if (attachmentBytes > MAX_TENDER_ATTACHMENT_TOTAL_BYTES) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Tender attachments exceed the 25 MiB total limit', path: ['attachments'] });
      }
    });
}

export const createTenderSchema = createTenderSchemaForCatalog();
export type CreateTenderInput = z.infer<typeof createTenderSchema>;

export const updateTenderSchema = z.object({
  location: z.string().trim().min(2).max(120).refine(locationHasPostcode, 'Enter a valid UK postcode so delivery fees and matching companies can be determined'),
  urgency: z.enum(URGENCY_OPTIONS),
  closingDate: z.coerce.date().refine((value) => value.getTime() > Date.now(), 'Closing date must be in the future'),
  supplyDate: z.coerce.date().optional().refine((value) => !value || value.getTime() > Date.now(), 'Supply date must be in the future'),
  requirements: z.array(z.enum(REQUIREMENT_OPTIONS)).optional().default([]),
  description: z.string().trim().max(4000),
  items: z.array(z.object({
    id: z.string().cuid(),
    quantity: z.string().trim().min(1).max(120),
    description: z.string().trim().max(4000),
  })).min(1).max(50),
});

export type UpdateTenderInput = z.infer<typeof updateTenderSchema>;
