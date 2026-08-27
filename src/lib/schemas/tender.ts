import { z } from 'zod';
import { isValidService, isValidSubcategory, URGENCY_OPTIONS, REQUIREMENT_OPTIONS } from '@/lib/categories';

const serviceSchema = z.string().trim().refine(isValidService, 'Select a valid service');

const tenderItemSchema = z.object({
  category: serviceSchema,
  subcategory: z.string().trim().min(1),
  item: z.string().trim().min(1).optional(),
  quantity: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(4000),
});

const tenderAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().nonnegative().max(10 * 1024 * 1024),
  dataBase64: z.string().min(1).max(10 * 1024 * 1024 * 4),
});

export const createTenderSchema = z
  .object({
    projectName: z.string().trim().min(3).max(120),
    category: serviceSchema,
    subcategory: z.string().trim().min(1),
    item: z.string().trim().min(1).optional(),
    location: z.string().trim().min(2).max(120),
    quantity: z.string().trim().min(1).max(120),
    urgency: z.enum(URGENCY_OPTIONS),
    closingDate: z.coerce.date(),
    budget: z.coerce.number().int().nonnegative().optional(),
    requirements: z.array(z.enum(REQUIREMENT_OPTIONS)).optional().default([]),
    description: z.string().trim().min(10).max(4000),
    items: z.array(tenderItemSchema).max(50).optional(),
    attachments: z.array(tenderAttachmentSchema).max(10).optional().default([]),
  })
  .refine((value) => value.item ? isValidSubcategory(value.category, value.subcategory, value.item) : isValidSubcategory(value.category, value.subcategory), {
    message: 'Subcategory does not belong to the selected category',
    path: ['subcategory'],
  })
  .refine((value) => value.closingDate.getTime() > Date.now(), {
    message: 'Closing date must be in the future',
    path: ['closingDate'],
  })
  .superRefine((value, context) => {
    value.items?.forEach((item, index) => {
      if (!isValidSubcategory(item.category, item.subcategory, item.item)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Subcategory does not belong to the selected category', path: ['items', index, 'subcategory'] });
      }
    });
  });

export type CreateTenderInput = z.infer<typeof createTenderSchema>;
