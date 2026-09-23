import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';
import { COMPANY_OPERATING_LOCATIONS } from '@/lib/geography';
import { BUYER_DUTIES, BUYER_ORG_ROLES } from '@/lib/workspace-duties';
import { catalogServiceNames, isCatalogProvision, isCatalogService, type CategoryCatalog } from '@/lib/catalog';

export const personalProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phoneNumber: z.string().trim().max(40).optional(),
});

export function createProfileUpdateSchemaForCatalog(catalog: CategoryCatalog) {
  const services = catalogServiceNames(catalog);
  return personalProfileSchema.extend({
    companyName: z.string().trim().min(2).max(160).optional(),
    branchIdentifier: z.string().trim().min(2).max(120).optional(),
    companyType: z.enum(['SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY', 'OTHER']).optional(),
    services: z.array(z.string().trim().min(1)).max(Math.max(services.length, 1)).optional(),
    serviceProvisions: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
    operatingLocations: z.array(z.enum(COMPANY_OPERATING_LOCATIONS)).max(COMPANY_OPERATING_LOCATIONS.length).optional(),
    releaseSpendCapGbp: z.number().nonnegative().max(10_000_000).nullable().optional(),
  }).superRefine((value, context) => {
    value.services?.forEach((service, index) => {
      if (!isCatalogService(catalog, service)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['services', index], message: 'Select a service from the published catalog' });
      }
    });
    if (value.serviceProvisions === undefined) return;
    const selectedServices = value.services !== undefined ? new Set(value.services) : null;
    value.serviceProvisions.forEach((entry, index) => {
      const [service, ...provisionParts] = entry.split('::');
      const provision = provisionParts.join('::');
      const invalidService = selectedServices !== null && !selectedServices.has(service ?? '');
      if (!service || !provision || invalidService || !isCatalogProvision(catalog, service, provision)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProvisions', index], message: 'Select valid provisions for the services offered by your company' });
      }
    });
  });
}

export const additionalUserSchema = personalProfileSchema.extend({
  password: passwordSchema,
  orgRole: z.enum(BUYER_ORG_ROLES).optional(),
  duties: z.array(z.enum(BUYER_DUTIES)).min(1).max(BUYER_DUTIES.length).optional(),
});
