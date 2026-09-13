import type { ServiceName } from '@/lib/categories';
import { isIncorporatedCompanyType } from '@/lib/companyTypes';
export { isIncorporatedCompanyType };

export type VerificationDocumentType =
  | 'CERTIFICATE_OF_INCORPORATION'
  | 'PUBLIC_LIABILITY_INSURANCE'
  | 'EMPLOYERS_LIABILITY_INSURANCE'
  | 'WASTE_CARRIERS_LICENCE'
  | 'PROFESSIONAL_QUALIFICATIONS'
  | 'PROFESSIONAL_INDEMNITY_INSURANCE'
  | 'SSIP_ACCREDITATION'
  | 'HMRC_UTR_CONFIRMATION'
  | 'SA302_TAX_CALCULATION'
  | 'VAT_REGISTRATION_CERTIFICATE'
  | 'CIS_REGISTRATION_PROOF'
  | 'BUSINESS_BANK_STATEMENT'
  | 'CUSTOMER_INVOICES'
  | 'CUSTOMER_QUOTATIONS_OR_CONTRACTS'
  | 'TRADE_BODY_MEMBERSHIP'
  | 'TRADING_ACTIVITY_EVIDENCE';

type VerificationDocumentDefinition = {
  type: VerificationDocumentType;
  label: string;
  description: string;
  appliesTo: readonly ServiceName[] | 'all';
  required: boolean;
  expires: boolean;
  /** Sole trader self-employment evidence tier: any one STRONG document, or at least two distinct MODERATE documents, is sufficient. */
  soleTraderTier?: 'STRONG' | 'MODERATE';
  /** True only for the sole-trader-exclusive evidence types; these are excluded from the category-based document checklist. */
  soleTraderOnly?: boolean;
};

export const VERIFICATION_DOCUMENT_TYPES: readonly VerificationDocumentDefinition[] = [
  { type: 'CERTIFICATE_OF_INCORPORATION', label: 'Certificate of Incorporation', description: 'Mandatory evidence for incorporated company types (Limited Company, LLP, PLC). Optional for unincorporated businesses.', appliesTo: 'all', required: false, expires: false },
  { type: 'PUBLIC_LIABILITY_INSURANCE', label: 'Public Liability Insurance', description: 'Optional supporting evidence of public liability cover.', appliesTo: ['Materials', 'Waste', 'Plant Hire', 'Contractor Services', 'Professional Services'], required: false, expires: true, soleTraderTier: 'STRONG' },
  { type: 'EMPLOYERS_LIABILITY_INSURANCE', label: 'Employers Liability Insurance', description: 'Optional evidence where the business employs workers; upload it when legally applicable.', appliesTo: 'all', required: false, expires: true },
  { type: 'WASTE_CARRIERS_LICENCE', label: 'Waste Carriers Licence', description: 'Required for Waste Providers who transport or carry controlled waste.', appliesTo: ['Waste'], required: true, expires: true },
  { type: 'PROFESSIONAL_QUALIFICATIONS', label: 'Evidence of Qualifications', description: 'Optional supporting evidence of competence for Professional Services.', appliesTo: ['Professional Services'], required: false, expires: true },
  { type: 'PROFESSIONAL_INDEMNITY_INSURANCE', label: 'Professional Indemnity Insurance', description: 'Optional supporting evidence for Professional Services with professional liability exposure.', appliesTo: ['Professional Services'], required: false, expires: true, soleTraderTier: 'STRONG' },
  { type: 'SSIP_ACCREDITATION', label: 'SSIP Accreditation', description: 'Optional evidence of a recognised Safety Schemes in Procurement accreditation.', appliesTo: 'all', required: false, expires: true },
  { type: 'HMRC_UTR_CONFIRMATION', label: 'HMRC UTR Confirmation', description: 'Strong sole trader evidence: HMRC Unique Taxpayer Reference confirming self-employment registration.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'STRONG', soleTraderOnly: true },
  { type: 'SA302_TAX_CALCULATION', label: 'SA302 Tax Calculation', description: 'Strong sole trader evidence: a recent SA302 tax calculation showing self-employed income.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'STRONG', soleTraderOnly: true },
  { type: 'VAT_REGISTRATION_CERTIFICATE', label: 'VAT Registration Certificate', description: 'Strong sole trader evidence: a VAT registration certificate, if registered.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'STRONG', soleTraderOnly: true },
  { type: 'CIS_REGISTRATION_PROOF', label: 'CIS Registration Proof', description: 'Strong sole trader evidence: proof of registration under CIS as a subcontractor or contractor.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'STRONG', soleTraderOnly: true },
  { type: 'BUSINESS_BANK_STATEMENT', label: 'Business Bank Statement', description: 'Moderate sole trader evidence: a recent business bank account statement.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'MODERATE', soleTraderOnly: true },
  { type: 'CUSTOMER_INVOICES', label: 'Customer Invoices', description: 'Moderate sole trader evidence: recent customer invoices.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'MODERATE', soleTraderOnly: true },
  { type: 'CUSTOMER_QUOTATIONS_OR_CONTRACTS', label: 'Customer Quotations or Contracts', description: 'Moderate sole trader evidence: quotations or contracts issued to customers.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'MODERATE', soleTraderOnly: true },
  { type: 'TRADE_BODY_MEMBERSHIP', label: 'Trade Body Membership', description: 'Moderate sole trader evidence: membership of a professional or trade body.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'MODERATE', soleTraderOnly: true },
  { type: 'TRADING_ACTIVITY_EVIDENCE', label: 'Trading Activity Evidence', description: 'Moderate sole trader evidence: a business website, business email using a trading domain, or marketing materials showing trading activity.', appliesTo: 'all', required: false, expires: false, soleTraderTier: 'MODERATE', soleTraderOnly: true },
];

export const SOLE_TRADER_STRONG_DOCUMENT_TYPES: readonly VerificationDocumentType[] = VERIFICATION_DOCUMENT_TYPES.filter((doc) => doc.soleTraderTier === 'STRONG').map((doc) => doc.type);
export const SOLE_TRADER_MODERATE_DOCUMENT_TYPES: readonly VerificationDocumentType[] = VERIFICATION_DOCUMENT_TYPES.filter((doc) => doc.soleTraderTier === 'MODERATE').map((doc) => doc.type);
export const SOLE_TRADER_EVIDENCE_DOCUMENT_TYPES: readonly VerificationDocumentType[] = [...SOLE_TRADER_STRONG_DOCUMENT_TYPES, ...SOLE_TRADER_MODERATE_DOCUMENT_TYPES];

export function getSoleTraderEvidenceDocuments(): VerificationDocumentDefinition[] {
  return VERIFICATION_DOCUMENT_TYPES.filter((doc) => doc.soleTraderTier !== undefined);
}

export function isSoleTraderEvidenceDocument(documentType: VerificationDocumentType): boolean {
  return SOLE_TRADER_EVIDENCE_DOCUMENT_TYPES.includes(documentType);
}

/** Sole trader self-employment evidence rule: any one strong document, or at least two distinct moderate documents. */
export function isSoleTraderEvidenceSufficient(validDocumentTypes: readonly VerificationDocumentType[]): boolean {
  const hasStrong = validDocumentTypes.some((type) => SOLE_TRADER_STRONG_DOCUMENT_TYPES.includes(type));
  if (hasStrong) return true;
  const moderateCount = new Set(validDocumentTypes.filter((type) => SOLE_TRADER_MODERATE_DOCUMENT_TYPES.includes(type))).size;
  return moderateCount >= 2;
}

export function verificationDocumentExpires(documentType: VerificationDocumentType): boolean {
  return VERIFICATION_DOCUMENT_TYPES.find((doc) => doc.type === documentType)?.expires ?? true;
}

function normaliseCategories(categories: string | string[] | null | undefined): string[] {
  return Array.isArray(categories) ? categories : (categories ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

export function getApplicableVerificationDocuments(categories: string | string[] | null | undefined): VerificationDocumentDefinition[] {
  const values = normaliseCategories(categories);
  return VERIFICATION_DOCUMENT_TYPES.filter((doc) => !doc.soleTraderOnly && (doc.appliesTo === 'all' || doc.appliesTo.some((service) => values.includes(service))));
}

export function isVerificationDocumentApplicable(documentType: VerificationDocumentType, categories: string | string[] | null | undefined): boolean {
  return getApplicableVerificationDocuments(categories).some((doc) => doc.type === documentType);
}

/** Sole traders may also upload the sole-trader-exclusive evidence types in addition to their category-based documents. */
export function isDocumentApplicableForProfile(documentType: VerificationDocumentType, categories: string | string[] | null | undefined, isSoleTrader: boolean): boolean {
  if (isSoleTrader && isSoleTraderEvidenceDocument(documentType)) return true;
  return isVerificationDocumentApplicable(documentType, categories);
}

export function getRequiredVerificationDocumentTypes(categories: string | string[] | null | undefined, companyType?: string | null | undefined): VerificationDocumentType[] {
  const baseRequired = getApplicableVerificationDocuments(categories).filter((doc) => doc.required).map((doc) => doc.type);
  if (isIncorporatedCompanyType(companyType) && !baseRequired.includes('CERTIFICATE_OF_INCORPORATION')) {
    return ['CERTIFICATE_OF_INCORPORATION', ...baseRequired];
  }
  return baseRequired;
}
