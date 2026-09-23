const COMPANY_TOKEN = /\b(ltd|limited|plc|llp|cic|group|inc|llp)\b/i;

export function looksLikeCompanyName(value: string): boolean {
  return COMPANY_TOKEN.test(value.trim());
}

export function splitContactName(contactName: string, companyName?: string | null): { firstName: string; lastName: string } {
  const trimmed = contactName.trim();
  if (!trimmed || (companyName && trimmed.toLowerCase() === companyName.trim().toLowerCase()) || looksLikeCompanyName(trimmed)) {
    return { firstName: 'Primary', lastName: 'contact' };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'contact' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function personNameFromAccount(input: {
  firstName: string | null;
  lastName: string | null;
  contactName: string;
  companyName?: string | null;
}): { firstName: string; lastName: string } {
  const firstName = input.firstName?.trim() ?? '';
  const lastName = input.lastName?.trim() ?? '';
  if (firstName && lastName && !looksLikeCompanyName(lastName) && !looksLikeCompanyName(`${firstName} ${lastName}`)) {
    return { firstName, lastName };
  }
  return splitContactName(input.contactName, input.companyName);
}
