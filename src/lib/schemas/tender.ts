import { z } from 'zod';
import { CATEGORY_NAMES, isValidSubcategory, URGENCY_OPTIONS, REQUIREMENT_OPTIONS } from '@/lib/categories';

const tenderItemSchema = z.object({
  category: z.enum(CATEGORY_NAMES as [string, ...string[]]),
  subcategory: z.string().trim().min(1),
  quantity: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(4000),
});

export const createTenderSchema = z
  .object({
    projectName: z.string().trim().min(3).max(120),
    category: z.enum(CATEGORY_NAMES as [string, ...string[]]),
    subcategory: z.string().trim().min(1),
    location: z.string().trim().min(2).max(120),
    quantity: z.string().trim().min(1).max(120),
    urgency: z.enum(URGENCY_OPTIONS),
    closingDate: z.coerce.date(),
    budget: z.coerce.number().int().nonnegative().optional(),
    requirements: z.array(z.enum(REQUIREMENT_OPTIONS)).optional().default([]),
    description: z.string().trim().min(10).max(4000),
    items: z.array(tenderItemSchema).max(50).optional(),
  })
  .refine((value) => isValidSubcategory(value.category, value.subcategory), {
    message: 'Subcategory does not belong to the selected category',
    path: ['subcategory'],
  })
  .refine((value) => value.closingDate.getTime() > Date.now(), {
    message: 'Closing date must be in the future',
    path: ['closingDate'],
  })
  .superRefine((value, context) => {
    value.items?.forEach((item, index) => {
      if (!isValidSubcategory(item.category, item.subcategory)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Subcategory does not belong to the selected category', path: ['items', index, 'subcategory'] });
      }
    });
  });

export type CreateTenderInput = z.infer<typeof createTenderSchema>;
