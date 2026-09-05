import type { PaymentType } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { CLIENT_RELEASE_FEE_GBP, RETAILER_UNLOCK_FEE_GBP } from '@/lib/categories';

const defaultSettings: Record<string, string> = {
  RETAILER_UNLOCK_FEE_GBP: String(RETAILER_UNLOCK_FEE_GBP),
  CLIENT_RELEASE_FEE_GBP: String(CLIENT_RELEASE_FEE_GBP),
  CLIENT_RELEASE_FEE_MODE: 'FIXED',
  CLIENT_RELEASE_PERCENTAGE_LOW: '1',
  CLIENT_RELEASE_PERCENTAGE_HIGH: '0.5',
  CLIENT_RELEASE_PERCENTAGE_TOP: '0.25',
  VAT_PERCENTAGE: '20',
  SPONSORED_PLACEMENT_ACTIVE: 'false',
  SPONSORED_PLACEMENT_FEE_GBP: '25',
  MEMBERSHIP_TIERS_ACTIVE: 'false',
  ADSPACE_ACTIVE: 'false',
  RETAILER_ANALYTICS_SECTION_TRENDS: 'true',
  RETAILER_ANALYTICS_SECTION_CATEGORY: 'true',
  RETAILER_ANALYTICS_SECTION_REGIONAL: 'true',
  RETAILER_ANALYTICS_SECTION_QUOTE_VALUE: 'true',
  RETAILER_ANALYTICS_SECTION_RESPONSE_TIME: 'true',
  RETAILER_ANALYTICS_SECTION_BENCHMARK: 'true',
};

export const RETAILER_ANALYTICS_SECTION_KEYS = [
  'RETAILER_ANALYTICS_SECTION_TRENDS',
  'RETAILER_ANALYTICS_SECTION_CATEGORY',
  'RETAILER_ANALYTICS_SECTION_REGIONAL',
  'RETAILER_ANALYTICS_SECTION_QUOTE_VALUE',
  'RETAILER_ANALYTICS_SECTION_RESPONSE_TIME',
  'RETAILER_ANALYTICS_SECTION_BENCHMARK',
] as const;

export type RetailerAnalyticsSectionKey = (typeof RETAILER_ANALYTICS_SECTION_KEYS)[number];

export async function getRetailerAnalyticsSectionSettings(): Promise<Record<RetailerAnalyticsSectionKey, boolean>> {
  const settings = await prisma.platformSetting.findMany({ where: { key: { in: [...RETAILER_ANALYTICS_SECTION_KEYS] } } });
  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  return Object.fromEntries(
    RETAILER_ANALYTICS_SECTION_KEYS.map((key) => [key, (map.get(key) ?? defaultSettings[key]) === 'true'])
  ) as Record<RetailerAnalyticsSectionKey, boolean>;
}

export async function getPlatformSetting(key: string): Promise<string | null> {
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  return setting?.value ?? defaultSettings[key] ?? null;
}

export async function getPaymentFeeGbp(type: PaymentType): Promise<number> {
  const key = type === 'RETAILER_UNLOCK'
    ? 'RETAILER_UNLOCK_FEE_GBP'
    : type === 'SPONSORED_PLACEMENT'
      ? 'SPONSORED_PLACEMENT_FEE_GBP'
      : 'CLIENT_RELEASE_FEE_GBP';
  const value = Number(await getPlatformSetting(key));
  return Number.isInteger(value) && value >= 0 ? value : Number(defaultSettings[key]);
}

export async function getVatPercentage(): Promise<number> {
  const percentage = Number(await getPlatformSetting('VAT_PERCENTAGE'));
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : Number(defaultSettings.VAT_PERCENTAGE);
}

export function calculateVatGbp(netAmountGbp: number, percentage: number): number {
  return Math.round(netAmountGbp * (percentage / 100) * 100) / 100;
}

/** Resolves fee, VAT, and gross to whole pence so the Stripe charge always equals the stored total. */
export function buildPaymentAmounts(netAmountGbp: number, vatPercentage: number) {
  const netPence = Math.round(netAmountGbp * 100);
  const vatPence = Math.round(calculateVatGbp(netPence / 100, vatPercentage) * 100);
  return {
    amountGbp: netPence / 100,
    vatGbp: vatPence / 100,
    totalAmountGbp: (netPence + vatPence) / 100,
    netPence,
    vatPence,
  };
}

export function calculatePercentageFee(quotePriceGbp: number, lowPercentage: number, highPercentage: number, topPercentage: number): number {
  const quotePence = Math.round(quotePriceGbp * 100);
  const firstBandPence = Math.min(quotePence, 1_000_000);
  const secondBandPence = Math.min(Math.max(quotePence - 1_000_000, 0), 9_000_000);
  const topBandPence = Math.max(quotePence - 10_000_000, 0);
  const feePence = Math.round(
    firstBandPence * (lowPercentage / 100)
    + secondBandPence * (highPercentage / 100)
    + topBandPence * (topPercentage / 100)
  );
  return feePence / 100;
}

export async function getClientReleaseFeeGbp(quotePriceGbp: number): Promise<number> {
  const mode = await getPlatformSetting('CLIENT_RELEASE_FEE_MODE');
  if (mode !== 'PERCENTAGE') return getPaymentFeeGbp('CLIENT_RELEASE');
  const lowPercentage = Number(await getPlatformSetting('CLIENT_RELEASE_PERCENTAGE_LOW'));
  const highPercentage = Number(await getPlatformSetting('CLIENT_RELEASE_PERCENTAGE_HIGH'));
  const topPercentage = Number(await getPlatformSetting('CLIENT_RELEASE_PERCENTAGE_TOP'));
  return calculatePercentageFee(quotePriceGbp, lowPercentage, highPercentage, topPercentage);
}

export async function isAdspaceActive(): Promise<boolean> {
  return await getPlatformSetting('ADSPACE_ACTIVE') === 'true';
}

export async function getAdminSettings() {
  const [settings, tiers, subscriptions, categoryDefinitions, retailers] = await Promise.all([
    prisma.platformSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.membershipTier.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.categoryDefinition.findMany({ orderBy: [{ service: 'asc' }, { name: 'asc' }] }),
    prisma.user.findMany({ where: { role: 'PROVIDER' }, select: { id: true, email: true, retailerProfile: { select: { companyName: true } }, memberships: { where: { active: true }, include: { tier: true } }, subscriptions: { where: { active: true }, include: { plan: true } } }, orderBy: { createdAt: 'asc' } }),
  ]);
  return {
    fees: {
      retailerUnlockGbp: Number(settings.find((setting) => setting.key === 'RETAILER_UNLOCK_FEE_GBP')?.value ?? defaultSettings.RETAILER_UNLOCK_FEE_GBP),
      clientReleaseGbp: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_FEE_GBP')?.value ?? defaultSettings.CLIENT_RELEASE_FEE_GBP),
      clientReleaseMode: settings.find((setting) => setting.key === 'CLIENT_RELEASE_FEE_MODE')?.value ?? defaultSettings.CLIENT_RELEASE_FEE_MODE,
      clientReleasePercentageLow: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_LOW')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_LOW),
      clientReleasePercentageHigh: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_HIGH')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_HIGH),
      clientReleasePercentageTop: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_TOP')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_TOP),
      vatPercentage: Number(settings.find((setting) => setting.key === 'VAT_PERCENTAGE')?.value ?? defaultSettings.VAT_PERCENTAGE),
      sponsoredPlacementActive: (settings.find((setting) => setting.key === 'SPONSORED_PLACEMENT_ACTIVE')?.value ?? defaultSettings.SPONSORED_PLACEMENT_ACTIVE) === 'true',
      sponsoredPlacementFeeGbp: Number(settings.find((setting) => setting.key === 'SPONSORED_PLACEMENT_FEE_GBP')?.value ?? defaultSettings.SPONSORED_PLACEMENT_FEE_GBP),
      membershipTiersActive: (settings.find((setting) => setting.key === 'MEMBERSHIP_TIERS_ACTIVE')?.value ?? defaultSettings.MEMBERSHIP_TIERS_ACTIVE) === 'true',
      adspaceActive: (settings.find((setting) => setting.key === 'ADSPACE_ACTIVE')?.value ?? defaultSettings.ADSPACE_ACTIVE) === 'true',
    },
    tiers,
    subscriptions,
    categoryDefinitions: categoryDefinitions.map((category) => ({ ...category, items: JSON.parse(category.itemsJson) as string[] })),
    retailers,
    retailerAnalyticsSections: Object.fromEntries(
      RETAILER_ANALYTICS_SECTION_KEYS.map((key) => [key, (settings.find((setting) => setting.key === key)?.value ?? defaultSettings[key]) === 'true'])
    ) as Record<RetailerAnalyticsSectionKey, boolean>,
  };
}
