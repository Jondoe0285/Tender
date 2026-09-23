import { z } from 'zod';
import { passwordSchema } from '@/lib/schemas/password';
import { SERVICE_CATALOG } from '@/lib/categories';
import { catalogServiceNames, cloneCatalog, isCatalogProvision, isCatalogService, type CategoryCatalog } from '@/lib/catalog';

export function createRegisterSchemaForCatalog(catalog: CategoryCatalog) {
  const services = catalogServiceNames(catalog);
  return z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    password: passwordSchema,
    contactName: z.string().trim().min(2).max(120),
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    role: z.literal('USER'),
    termsAccepted: z.literal(true, { message: 'You must accept the terms to register' }),
    privacyAccepted: z.literal(true, { message: 'You must acknowledge the privacy policy to register' }),
    companyName: z.string().trim().min(2).max(160).optional(),
    branchIdentifier: z.string().trim().min(2).max(120).optional(),
    companyType: z.enum(['SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY', 'OTHER']).optional(),
    categories: z.array(z.string().trim().min(1)).max(Math.max(services.length, 1)).optional(),
    serviceProvisions: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
    coverageScope: z.enum(['COUNTY', 'REGION', 'UK']).optional(),
    counties: z.array(z.string()).max(60).optional(),
    regions: z.array(z.string()).max(20).optional(),
  }).superRefine((value, context) => {
    value.categories?.forEach((service, index) => {
      if (!isCatalogService(catalog, service)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['categories', index], message: 'Select a service from the published catalog' });
      }
    });
    if ((value.categories?.length ?? 0) > 0 && (value.serviceProvisions?.length ?? 0) === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProvisions'], message: 'Select at least one provision for the services you supply' });
    }
    if (!value.serviceProvisions) return;
    const selectedServices = new Set(value.categories ?? []);
    value.serviceProvisions.forEach((entry, index) => {
      const [service, ...provisionParts] = entry.split('::');
      const provision = provisionParts.join('::');
      if (!service || !provision || !selectedServices.has(service) || !isCatalogProvision(catalog, service, provision)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProvisions', index], message: 'Select valid provisions for the services offered by your company' });
      }
    });
  });
}

export const registerSchema = createRegisterSchemaForCatalog(cloneCatalog(SERVICE_CATALOG));
export type RegisterInput = z.infer<typeof registerSchema>;
