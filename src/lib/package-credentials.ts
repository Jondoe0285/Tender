export type CredentialType =
  | 'WASTE_CARRIERS_LICENCE'
  | 'PUBLIC_LIABILITY_INSURANCE'
  | 'PROFESSIONAL_INDEMNITY_INSURANCE';

export type CredentialRecord = {
  documentType: string;
  verified?: boolean;
  expiryDate?: Date | string | null;
};

export type CredentialPackage = {
  category: string;
  subcategory?: string | null;
  specJson?: string | null;
};

const EXPIRING_CREDENTIALS: readonly CredentialType[] = [
  'WASTE_CARRIERS_LICENCE',
  'PUBLIC_LIABILITY_INSURANCE',
  'PROFESSIONAL_INDEMNITY_INSURANCE',
];

export function packageRequiresHazardousWasteCarrier(pkg: CredentialPackage): boolean {
  if (pkg.category !== 'Waste') return false;
  if (pkg.subcategory === 'Hazardous waste') return true;
  try {
    const spec = JSON.parse(pkg.specJson ?? '{}') as { hazardous?: boolean };
    return spec.hazardous === true;
  } catch {
    return false;
  }
}

export function requiredMatchCredentials(packages: readonly CredentialPackage[]): CredentialType[] {
  return packages.some((pkg) => packageRequiresHazardousWasteCarrier(pkg)) ? ['WASTE_CARRIERS_LICENCE'] : [];
}

export function requiredUnlockCredentials(packages: readonly CredentialPackage[]): CredentialType[] {
  const required = new Set<CredentialType>(requiredMatchCredentials(packages));
  if (packages.some((pkg) => pkg.category === 'Waste')) required.add('WASTE_CARRIERS_LICENCE');
  if (packages.some((pkg) => pkg.category === 'Plant Hire')) required.add('PUBLIC_LIABILITY_INSURANCE');
  if (packages.some((pkg) => pkg.category === 'Professional Services')) required.add('PROFESSIONAL_INDEMNITY_INSURANCE');
  return [...required];
}

export function hasUnexpiredCredential(documents: readonly CredentialRecord[], type: CredentialType, now = new Date()): boolean {
  return documents.some((document) => {
    if (document.documentType !== type) return false;
    if (document.verified === false) return false;
    if (!document.expiryDate) return !EXPIRING_CREDENTIALS.includes(type);
    return new Date(document.expiryDate).getTime() > now.getTime();
  });
}

export function missingCredentials(
  packages: readonly CredentialPackage[],
  documents: readonly CredentialRecord[],
  scope: 'match' | 'unlock',
  now = new Date(),
): CredentialType[] {
  const required = scope === 'match' ? requiredMatchCredentials(packages) : requiredUnlockCredentials(packages);
  return required.filter((type) => !hasUnexpiredCredential(documents, type, now));
}

export function credentialsMessage(missing: readonly CredentialType[]): string {
  const labels: Record<CredentialType, string> = {
    WASTE_CARRIERS_LICENCE: 'a current Waste Carriers Licence',
    PUBLIC_LIABILITY_INSURANCE: 'current public liability insurance',
    PROFESSIONAL_INDEMNITY_INSURANCE: 'current professional indemnity insurance',
  };
  if (missing.length === 0) return '';
  if (missing.length === 1) return `${labels[missing[0]]} is required for this package.`;
  return `${missing.map((type) => labels[type]).join(' and ')} are required for this package.`;
}
