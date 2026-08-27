export const MANAGED_ACCOUNT_ROLES = ['CLIENT', 'RETAILER'] as const;
export type ManagedAccountRole = (typeof MANAGED_ACCOUNT_ROLES)[number];

export function isManagedAccountRole(role: string | undefined): role is ManagedAccountRole {
  return role === 'CLIENT' || role === 'RETAILER';
}

export function canManageUserAccounts(role: string | undefined): boolean {
  return role === 'SUPER_USER';
}
