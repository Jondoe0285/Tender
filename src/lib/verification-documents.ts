import type { ServiceName } from '@/lib/categories';

export type VerificationDocumentType =
  | 'CERTIFICATE_OF_INCORPORATION'
  | 'PUBLIC_LIABILITY_INSURANCE'
  | 'EMPLOYERS_LIABILITY_INSURANCE'
  | 'WASTE_CARRIERS_LICENCE'
  | 'PROFESSIONAL_QUALIFICATIONS'
  | 'PROFESSIONAL_INDEMNITY_INSURANCE'
  | 'SSIP_ACCREDITATION';

type VerificationDocumentDefinition = {
  type: VerificationDocumentType;
  label: string;
  description: string;
  appliesTo: ServiceName | 'all';
  required: boolean;
};

export const VERIFICATION_DOCUMENT_TYPES: readonly VerificationDocumentDefinition[] = [
  { type: 'CERTIFICATE_OF_INCORPORATION', label: 'Certificate of Incorporation', description: 'Evidence your business is a registered legal entity.', appliesTo: 'all', required: true },
  { type: 'PUBLIC_LIABILITY_INSURANCE', label: 'Public Liability Insurance', description: 'A current certificate of public liability cover.', appliesTo: 'all', required: true },
  { type: 'EMPLOYERS_LIABILITY_INSURANCE', label: 'Employers Liability Insurance', description: 'A current certificate of employers liability cover.', appliesTo: 'all', required: true },
  { type: 'WASTE_CARRIERS_LICENCE', label: 'Waste Carriers Licence', description: 'Required for Providers who handle waste.', appliesTo: 'Waste', required: true },
  { type: 'PROFESSIONAL_QUALIFICATIONS', label: 'Evidence of Qualifications', description: 'Required for Professional Services Providers.', appliesTo: 'Professional Services', required: true },
  { type: 'PROFESSIONAL_INDEMNITY_INSURANCE', label: 'Professional Indemnity Insurance', description: 'Required for Professional Services Providers.', appliesTo: 'Professional Services', required: true },
  { type: 'SSIP_ACCREDITATION', label: 'SSIP Accreditation', description: 'Optional evidence of a recognised Safety Schemes in Procurement accreditation.', appliesTo: 'all', required: false },
];

function normaliseCategories(categories: string | string[] | null | undefined): string[] {
  return Array.isArray(categories) ? categories : (categories ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

export function getApplicableVerificationDocuments(categories: string | string[] | null | undefined): VerificationDocumentDefinition[] {
  const values = normaliseCategories(categories);
  return VERIFICATION_DOCUMENT_TYPES.filter((doc) => doc.appliesTo === 'all' || values.includes(doc.appliesTo));
}

export function isVerificationDocumentApplicable(documentType: VerificationDocumentType, categories: string | string[] | null | undefined): boolean {
  return getApplicableVerificationDocuments(categories).some((doc) => doc.type === documentType);
}

export function getRequiredVerificationDocumentTypes(categories: string | string[] | null | undefined): VerificationDocumentType[] {
  return getApplicableVerificationDocuments(categories).filter((doc) => doc.required).map((doc) => doc.type);
}
