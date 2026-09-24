export const COMPANY_TYPES = ['SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY', 'OTHER'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  SOLE_TRADER: 'Sole trader',
  LIMITED_COMPANY: 'Limited company',
  PARTNERSHIP: 'Partnership',
  LIMITED_LIABILITY_PARTNERSHIP: 'Limited liability partnership (LLP)',
  PUBLIC_LIMITED_COMPANY: 'Public limited company (PLC)',
  OTHER: 'Other',
};

export const UK_COUNTIES = [
  'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire', 'Cheshire', 'Cleveland', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon', 'Dorset', 'Durham', 'East Sussex', 'Essex', 'Gloucestershire', 'Greater London', 'Greater Manchester', 'Hampshire', 'Hereford and Worcester', 'Hertfordshire', 'Humberside', 'Isle of Wight', 'Kent', 'Lancashire', 'Leicestershire', 'Lincolnshire', 'Merseyside', 'Middlesex', 'Milton Keynes', 'Norfolk', 'North Yorkshire', 'Northamptonshire', 'Northumberland', 'Nottinghamshire', 'Oxfordshire', 'Peterborough', 'Rutland', 'Shropshire', 'Somerset', 'South Yorkshire', 'Staffordshire', 'Suffolk', 'Surrey', 'Tyne and Wear', 'Warwickshire', 'West Midlands', 'West Sussex', 'West Yorkshire', 'Wiltshire', 'Worcestershire', 'Yorkshire',
] as const;

export const UK_REGIONS = [
  'London', 'South East', 'South West', 'East of England', 'East Midlands', 'West Midlands', 'Yorkshire and The Humber', 'North East', 'North West', 'Wales', 'Scotland', 'Northern Ireland', 'Channel Islands & Isle of Man',
] as const;

export const OPERATING_LOCATIONS = ['United Kingdom', ...UK_REGIONS, ...UK_COUNTIES] as const;

export const REQUIREMENT_OPTIONS = [
  'Site access required',
  'Delivery to site required',
  'Collection or uplift required',
  'Driver or operator required',
  'Timed delivery required',
  'Delivery booking required',
  'Offloading required',
  'Lifting equipment required',
  'Parking or restricted-access arrangements',
  'Site induction required',
  'PPE required',
  'CSCS-certified operative required',
  'SSIP membership required',
  'Risk assessment (RAMS) required',
  'Method statement required',
  'Proof of insurance required',
  'Public liability insurance required',
  'Employers liability insurance required',
  'Waste transfer note required',
  'Waste segregation or skip exchange required',
  'Plant, machinery or specialist equipment required',
  'Lift plan required',
  'Out-of-hours access',
  'Working windows or scheduling constraints',
  'Pre-start survey or site visit required',
] as const;

export const URGENCY_OPTIONS = ['standard', 'urgent', 'flexible'] as const;

export const SUPPORT_TYPES = ['SUPPORT', 'CHANGE', 'PAYMENT', 'DATA_PRIVACY'] as const;
export const DATA_SUBJECT_RIGHTS = ['ACCESS_EXPORT', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'OBJECTION'] as const;

export const WASTE_CONTAINERS = ['skip', 'grab', 'roll-on'] as const;
export const MATERIAL_PACKS = ['bag', 'pallet', 'pack', 'bulk', 'each'] as const;
export const COMMON_EWC_CODES = [
  '17 01 01', '17 01 02', '17 01 03', '17 01 07', '17 02 01', '17 02 02', '17 02 03', '17 03 02', '17 03 01*', '17 04 05', '17 04 07', '17 05 04', '17 05 03*', '17 06 04', '17 06 01*', '17 08 02', '17 09 04', '15 01 01', '15 01 02', '20 03 01',
] as const;

export const ATTACHMENT_KINDS = ['DRAWING', 'SPECIFICATION', 'RAMS', 'METHOD_STATEMENT', 'INSURANCE', 'OTHER'] as const;

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CLIENT_RELEASE: 'Quote release fee',
  RETAILER_UNLOCK: 'Tender unlock',
  SPONSORED_PLACEMENT: 'Sponsored placement',
  MEMBERSHIP_TIER: 'Membership',
  INDEPENDENT_REVIEW: 'Enhanced verification',
  DIRECT_CONTACT: 'Direct contact',
  PROFESSIONAL_INTEREST: 'Professional interest',
};

export const FULL_QUOTE_ACCEPTANCE_COPY = 'Acceptance applies to the full submitted quote value, not selected quote lines.';

export function isSpecifiedItemService(service: string | undefined): boolean {
  const value = String(service ?? '').trim().toLowerCase();
  return value === 'materials' || value === 'waste' || value === 'plant hire';
}

export function isContractorService(service: string | undefined): boolean {
  return String(service ?? '').trim().toLowerCase().includes('contractor');
}

export function isProfessionalService(service: string | undefined): boolean {
  return String(service ?? '').trim().toLowerCase().includes('professional');
}

export function isSiteVisitService(service: string | undefined): boolean {
  return isContractorService(service) || isProfessionalService(service);
}

export function quantityUnitsFor(service: string): string[] {
  const value = service.trim().toLowerCase();
  if (value === 'waste') return ['tonnes'];
  if (value === 'materials') return ['units', 'tonnes', 'bags', 'pallets', 'm³', 'skip'];
  if (value === 'plant hire') return ['days', 'weeks', 'months'];
  if (value.includes('contractor')) return ['m', 'm²', 'm³', 'nr', 'item', 'week', 'days', 'weeks', 'months', 'not applicable'];
  return ['not applicable', 'days', 'weeks', 'months'];
}

export function formatUkDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

export function defaultClosingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

export type CategoryCatalog = Record<string, Record<string, string[]>>;
