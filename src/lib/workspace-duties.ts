export const BUYER_DUTIES = ['RAISER', 'ESTIMATOR', 'APPROVER', 'AUDITOR'] as const;
export type BuyerDuty = (typeof BUYER_DUTIES)[number];

export const BUYER_ORG_ROLES = ['BUYER', 'ESTIMATOR', 'AUDITOR'] as const;
export type BuyerOrgRole = (typeof BUYER_ORG_ROLES)[number];
export type BuyerOrgRoleView = BuyerOrgRole | 'OWNER' | 'UNSCOPED';

export const BUYER_ORG_ROLE_DUTIES: Record<BuyerOrgRole, readonly BuyerDuty[]> = {
  BUYER: ['RAISER', 'ESTIMATOR', 'APPROVER'],
  ESTIMATOR: ['RAISER', 'ESTIMATOR'],
  AUDITOR: ['AUDITOR'],
};

export const BUYER_ORG_ROLE_LABELS: Record<BuyerOrgRoleView, string> = {
  OWNER: 'Workspace owner',
  BUYER: 'Buyer',
  ESTIMATOR: 'QS / estimator',
  AUDITOR: 'Auditor',
  UNSCOPED: 'Workspace member',
};

export const DEFAULT_ADDITIONAL_BUYER_ORG_ROLE: BuyerOrgRole = 'ESTIMATOR';

export const PRIMARY_BUYER_DUTIES = BUYER_DUTIES.join(',');
export const ADDITIONAL_BUYER_DUTIES = BUYER_ORG_ROLE_DUTIES.ESTIMATOR.join(',');

export const SUPPLIER_PAYMENTS_PERMISSION = 'PAYMENTS';

export type BuyerWorkspaceCapabilities = {
  orgRole: BuyerOrgRoleView;
  canRaiseTender: boolean;
  canEstimate: boolean;
  canAward: boolean;
};

export function parseBuyerDuties(value: string | null | undefined): Set<BuyerDuty> {
  const allowed = new Set<string>(BUYER_DUTIES);
  return new Set(
    (value ?? PRIMARY_BUYER_DUTIES)
      .split(',')
      .map((duty) => duty.trim())
      .filter((duty): duty is BuyerDuty => allowed.has(duty)),
  );
}

export function serialiseBuyerDuties(duties: readonly string[]): string {
  const allowed = new Set<string>(BUYER_DUTIES);
  return [...new Set(duties.map((duty) => duty.trim()).filter((duty) => allowed.has(duty)))].join(',');
}

export function hasBuyerDuty(value: string | null | undefined, duty: BuyerDuty): boolean {
  return parseBuyerDuties(value).has(duty);
}

export function dutiesForBuyerOrgRole(role: BuyerOrgRole): BuyerDuty[] {
  return [...BUYER_ORG_ROLE_DUTIES[role]];
}

export function buyerOrgRoleFromDuties(duties: string | null | undefined, isPrimary = false): BuyerOrgRoleView {
  if (isPrimary) return 'OWNER';
  const parsed = parseBuyerDuties(duties);
  if (parsed.has('APPROVER')) return 'BUYER';
  if (parsed.has('RAISER') || parsed.has('ESTIMATOR')) return 'ESTIMATOR';
  return 'AUDITOR';
}

export function buyerOrgRoleLabel(role: BuyerOrgRoleView): string {
  return BUYER_ORG_ROLE_LABELS[role];
}

export function capabilitiesFromMembership(input: { duties: string | null | undefined; isPrimary: boolean } | null): BuyerWorkspaceCapabilities {
  if (!input) {
    return { orgRole: 'UNSCOPED', canRaiseTender: true, canEstimate: true, canAward: true };
  }
  if (input.isPrimary) {
    return { orgRole: 'OWNER', canRaiseTender: true, canEstimate: true, canAward: true };
  }
  const duties = parseBuyerDuties(input.duties);
  return {
    orgRole: buyerOrgRoleFromDuties(input.duties, false),
    canRaiseTender: duties.has('RAISER'),
    canEstimate: duties.has('ESTIMATOR') || duties.has('RAISER'),
    canAward: duties.has('APPROVER'),
  };
}

export function parseSupplierPermissions(value: string | null | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((permission) => permission.trim()).filter(Boolean));
}

export function canMakeSupplierPayment(permissions: string | null | undefined): boolean {
  return parseSupplierPermissions(permissions).has(SUPPLIER_PAYMENTS_PERMISSION);
}
