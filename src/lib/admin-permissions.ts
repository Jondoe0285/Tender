export const MANAGED_ACCOUNT_ROLES = ['CONTRACTOR', 'PROVIDER'] as const;
export type ManagedAccountRole = (typeof MANAGED_ACCOUNT_ROLES)[number];

export function isManagedAccountRole(role: string | undefined): role is ManagedAccountRole {
  return role === 'CONTRACTOR' || role === 'PROVIDER';
}

export function canManageUserAccounts(role: string | undefined): boolean {
  return role === 'SUPER_USER';
}

/** Owner-level Super Users control Super User accounts and critical platform settings (fees, adspace, membership tiers). */
export function canManagePlatformOwnership(user: { role: string; isOwner: boolean } | undefined | null): boolean {
  return user?.role === 'SUPER_USER' && user.isOwner === true;
}

/** Accountant sub-accounts see the Accounting Space only — never Super User settings or user management. */
export function isAccountantOnly(user: { role: string; isAccountant: boolean } | undefined | null): boolean {
  return user?.role === 'SUPER_USER' && user.isAccountant === true;
}
