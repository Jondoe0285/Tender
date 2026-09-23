export const BUYER_DUTIES = ['RAISER', 'ESTIMATOR', 'APPROVER', 'AUDITOR'] as const;
export type BuyerDuty = (typeof BUYER_DUTIES)[number];

export const PRIMARY_BUYER_DUTIES = BUYER_DUTIES.join(',');
export const ADDITIONAL_BUYER_DUTIES = 'RAISER,ESTIMATOR,AUDITOR';

export const SUPPLIER_PAYMENTS_PERMISSION = 'PAYMENTS';

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

export function parseSupplierPermissions(value: string | null | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((permission) => permission.trim()).filter(Boolean));
}

export function canMakeSupplierPayment(permissions: string | null | undefined): boolean {
  return parseSupplierPermissions(permissions).has(SUPPLIER_PAYMENTS_PERMISSION);
}
