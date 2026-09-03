import { z } from 'zod';

export const partnerDisplayLocations = ['FOOTER', 'DASHBOARD', 'ONBOARDING', 'CATEGORY_PAGE', 'EMAIL_FOOTER'] as const;

const logoPathSchema = z.string().trim().min(8).max(500).refine(
  (value) => value.startsWith('/images/') && !value.includes('..') && !value.includes('\\') && !/[?#]/.test(value),
  'Logo path must reference an image in /images.',
);

const destinationUrlSchema = z.string().trim().max(2048).url().refine(
  (value) => new URL(value).protocol === 'https:',
  'Destination URL must use HTTPS.',
);

const partnerFieldsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  logoPath: logoPathSchema,
  destinationUrl: destinationUrlSchema.optional(),
  displayLocation: z.enum(partnerDisplayLocations),
  campaignSource: z.string().trim().min(1).max(160).optional(),
  active: z.boolean(),
}).strict();

export const partnerRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), partner: partnerFieldsSchema }).strict(),
  z.object({ action: z.literal('update'), id: z.string().cuid(), partner: partnerFieldsSchema }).strict(),
  z.object({ action: z.literal('toggle'), id: z.string().cuid(), active: z.boolean() }).strict(),
  z.object({
    action: z.literal('reorder'),
    displayLocation: z.enum(partnerDisplayLocations),
    orderedIds: z.array(z.string().cuid()).min(1).max(100).refine(
      (ids) => new Set(ids).size === ids.length,
      'Partner order cannot contain duplicate records.',
    ),
  }).strict(),
]);

export type PartnerRequest = z.infer<typeof partnerRequestSchema>;