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
  appliesTo: readonly ServiceName[] | 'all';
  required: boolean;
  expires: boolean;
};

export const VERIFICATION_DOCUMENT_TYPES: readonly VerificationDocumentDefinition[] = [
  { type: 'CERTIFICATE_OF_INCORPORATION', label: 'Certificate of Incorporation', description: 'Optional evidence for Providers operating as an incorporated legal entity.', appliesTo: 'all', required: false, expires: false },
  { type: 'PUBLIC_LIABILITY_INSURANCE', label: 'Public Liability Insurance', description: 'Optional supporting evidence of public liability cover.', appliesTo: ['Materials', 'Waste', 'Plant Hire', 'Contractor Services', 'Professional Services'], required: false, expires: true },
  { type: 'EMPLOYERS_LIABILITY_INSURANCE', label: 'Employers Liability Insurance', description: 'Optional evidence where the business employs workers; upload it when legally applicable.', appliesTo: 'all', required: false, expires: true },
  { type: 'WASTE_CARRIERS_LICENCE', label: 'Waste Carriers Licence', description: 'Required for Waste Providers who transport or carry controlled waste.', appliesTo: ['Waste'], required: true, expires: true },
  { type: 'PROFESSIONAL_QUALIFICATIONS', label: 'Evidence of Qualifications', description: 'Optional supporting evidence of competence for Professional Services.', appliesTo: ['Professional Services'], required: false, expires: true },
  { type: 'PROFESSIONAL_INDEMNITY_INSURANCE', label: 'Professional Indemnity Insurance', description: 'Optional supporting evidence for Professional Services with professional liability exposure.', appliesTo: ['Professional Services'], required: false, expires: true },
  { type: 'SSIP_ACCREDITATION', label: 'SSIP Accreditation', description: 'Optional evidence of a recognised Safety Schemes in Procurement accreditation.', appliesTo: 'all', required: false, expires: true },
];

export function verificationDocumentExpires(documentType: VerificationDocumentType): boolean {
  return VERIFICATION_DOCUMENT_TYPES.find((doc) => doc.type === documentType)?.expires ?? true;
}

function normaliseCategories(categories: string | string[] | null | undefined): string[] {
  return Array.isArray(categories) ? categories : (categories ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

export function getApplicableVerificationDocuments(categories: string | string[] | null | undefined): VerificationDocumentDefinition[] {
  const values = normaliseCategories(categories);
  return VERIFICATION_DOCUMENT_TYPES.filter((doc) => doc.appliesTo === 'all' || doc.appliesTo.some((service) => values.includes(service)));
}

export function isVerificationDocumentApplicable(documentType: VerificationDocumentType, categories: string | string[] | null | undefined): boolean {
  return getApplicableVerificationDocuments(categories).some((doc) => doc.type === documentType);
}

export function getRequiredVerificationDocumentTypes(categories: string | string[] | null | undefined): VerificationDocumentType[] {
  return getApplicableVerificationDocuments(categories).filter((doc) => doc.required).map((doc) => doc.type);
}
