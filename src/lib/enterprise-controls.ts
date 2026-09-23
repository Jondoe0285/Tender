export const FOUR_EYES_SETTING_KEYS = ['VAT_PERCENTAGE', 'CLIENT_RELEASE_FEE_MODE', 'RETAILER_UNLOCK_FEE_MODE'] as const;
export type FourEyesSettingKey = (typeof FOUR_EYES_SETTING_KEYS)[number];

export function isFourEyesSettingKey(key: string): key is FourEyesSettingKey {
  return (FOUR_EYES_SETTING_KEYS as readonly string[]).includes(key);
}

export const PURCHASE_ORDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\- ]{2,39}$/;

export function isValidPurchaseOrderNumber(value: string): boolean {
  return PURCHASE_ORDER_PATTERN.test(value.trim());
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'Hidden';
  return `${local.slice(0, 1)}•••@${domain}`;
}

export function maskPhone(): string {
  return '••••';
}
