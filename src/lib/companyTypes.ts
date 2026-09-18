export type CompanyType = 'SOLE_TRADER' | 'LIMITED_COMPANY' | 'PARTNERSHIP' | 'LIMITED_LIABILITY_PARTNERSHIP' | 'PUBLIC_LIMITED_COMPANY' | 'OTHER';

export const COMPANY_TYPES: readonly CompanyType[] = ['SOLE_TRADER', 'LIMITED_COMPANY', 'PARTNERSHIP', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY', 'OTHER'];

export const INCORPORATED_COMPANY_TYPES: readonly CompanyType[] = ['LIMITED_COMPANY', 'LIMITED_LIABILITY_PARTNERSHIP', 'PUBLIC_LIMITED_COMPANY'];

export function isIncorporatedCompanyType(companyType: string | null | undefined): boolean {
  return companyType ? INCORPORATED_COMPANY_TYPES.includes(companyType as CompanyType) : false;
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  SOLE_TRADER: 'Sole trader',
  LIMITED_COMPANY: 'Limited company',
  PARTNERSHIP: 'Partnership',
  LIMITED_LIABILITY_PARTNERSHIP: 'Limited liability partnership (LLP)',
  PUBLIC_LIMITED_COMPANY: 'Public limited company (PLC)',
  OTHER: 'Other',
};
