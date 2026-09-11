import type { PaymentType } from '@prisma/client';
import { prisma } from '@/server/data/prisma';
import { CLIENT_RELEASE_FEE_GBP, RETAILER_UNLOCK_FEE_GBP } from '@/lib/categories';
import { SERVICE_NAMES } from '@/lib/categories';
import { VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentType } from '@/lib/verification-documents';
import { applyMasterEstimateReduction, estimateTenderQuoteValue, getReviewedQuoteEstimateBaselines } from '@/server/domain/quoteEstimateService';

const defaultSettings: Record<string, string> = {
  RETAILER_UNLOCK_FEE_GBP: String(RETAILER_UNLOCK_FEE_GBP),
  RETAILER_UNLOCK_FEE_MODE: 'FIXED',
  RETAILER_UNLOCK_PERCENTAGE_LOW: '1',
  RETAILER_UNLOCK_PERCENTAGE_HIGH: '0.5',
  RETAILER_UNLOCK_PERCENTAGE_TOP: '0.25',
  CONTRACTOR_SERVICE_UNLOCK_FEE_GBP: String(RETAILER_UNLOCK_FEE_GBP),
  PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP: String(RETAILER_UNLOCK_FEE_GBP),
  CLIENT_RELEASE_FEE_GBP: String(CLIENT_RELEASE_FEE_GBP),
  CLIENT_RELEASE_FEE_MODE: 'FIXED',
  CLIENT_RELEASE_PERCENTAGE_LOW: '1',
  CLIENT_RELEASE_PERCENTAGE_HIGH: '0.5',
  CLIENT_RELEASE_PERCENTAGE_TOP: '0.25',
  QUOTE_ESTIMATE_OFFSET_PERCENTAGE: '0',
  QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE: '0',
  VAT_PERCENTAGE: '20',
  SPONSORED_PLACEMENT_ACTIVE: 'false',
  SPONSORED_PLACEMENT_FEE_GBP: '25',
  MEMBERSHIP_TIERS_ACTIVE: 'false',
  RETAILER_LAUNCH_CREDITS_DEFAULT: '3',
  ADSPACE_ACTIVE: 'false',
  INDEPENDENT_REVIEW_ACTIVE: 'false',
  INDEPENDENT_REVIEW_FEE_GBP: '150',
  INDEPENDENT_REVIEW_RENEWAL_ACTIVE: 'false',
  INDEPENDENT_REVIEW_RENEWAL_FEE_GBP: '100',
  DIRECT_CONTACT_ACTIVE: 'false',
  DIRECT_CONTACT_FEE_GBP: '25',
  HUMAN_REVIEW_ACTIVE: 'true',
  VERIFICATION_DOCUMENT_REQUIREMENTS: '{}',
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

export async function getSupportRecipientEmail(): Promise<string | null> {
  return getPlatformSetting('SUPPORT_RECIPIENT_EMAIL');
}

export async function getPaymentFeeGbp(type: PaymentType): Promise<number> {
  const key = type === 'RETAILER_UNLOCK'
    ? 'RETAILER_UNLOCK_FEE_GBP'
    : type === 'SPONSORED_PLACEMENT'
      ? 'SPONSORED_PLACEMENT_FEE_GBP'
      : type === 'INDEPENDENT_REVIEW'
        ? 'INDEPENDENT_REVIEW_FEE_GBP'
        : type === 'DIRECT_CONTACT'
          ? 'DIRECT_CONTACT_FEE_GBP'
          : 'CLIENT_RELEASE_FEE_GBP';
  const value = Number(await getPlatformSetting(key));
  return Number.isInteger(value) && value >= 0 ? value : Number(defaultSettings[key]);
}

async function getPercentageBandSettings(prefix: 'CLIENT_RELEASE' | 'RETAILER_UNLOCK') {
  const lowPercentage = Number(await getPlatformSetting(`${prefix}_PERCENTAGE_LOW`));
  const highPercentage = Number(await getPlatformSetting(`${prefix}_PERCENTAGE_HIGH`));
  const topPercentage = Number(await getPlatformSetting(`${prefix}_PERCENTAGE_TOP`));
  return {
    lowPercentage: Number.isFinite(lowPercentage) ? lowPercentage : Number(defaultSettings[`${prefix}_PERCENTAGE_LOW`]),
    highPercentage: Number.isFinite(highPercentage) ? highPercentage : Number(defaultSettings[`${prefix}_PERCENTAGE_HIGH`]),
    topPercentage: Number.isFinite(topPercentage) ? topPercentage : Number(defaultSettings[`${prefix}_PERCENTAGE_TOP`]),
  };
}

export async function getQuoteEstimateOffsetPercentage(): Promise<number> {
  const percentage = Number(await getPlatformSetting('QUOTE_ESTIMATE_OFFSET_PERCENTAGE'));
  return Number.isFinite(percentage) && percentage >= -100 && percentage <= 100
    ? percentage
    : Number(defaultSettings.QUOTE_ESTIMATE_OFFSET_PERCENTAGE);
}

export async function getQuoteEstimateMasterReductionPercentage(): Promise<number> {
  const percentage = Number(await getPlatformSetting('QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE'));
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
    ? percentage
    : Number(defaultSettings.QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE);
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
  const { lowPercentage, highPercentage, topPercentage } = await getPercentageBandSettings('CLIENT_RELEASE');
  return calculatePercentageFee(quotePriceGbp, lowPercentage, highPercentage, topPercentage);
}

export function calculateTenderUnlockDynamicFeeGbp(estimatedTenderValueGbp: number, lowPercentage: number, highPercentage: number, topPercentage: number): number {
  return calculatePercentageFee(estimatedTenderValueGbp, lowPercentage, highPercentage, topPercentage);
}

export function tenderUsesFixedServiceRelease(categories: readonly string[]): 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP' | 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP' | null {
  if (categories.includes('Professional Services')) return 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP';
  if (categories.includes('Contractor Services')) return 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP';
  return null;
}

async function getConfiguredFeeGbp(key: keyof typeof defaultSettings): Promise<number> {
  const value = Number(await getPlatformSetting(key));
  return Number.isFinite(value) && value >= 0 ? value : Number(defaultSettings[key]);
}

export async function getTenderUnlockFeeGbp(tenderId: string): Promise<number> {
  const fixedUnlockFeeGbp = await getPaymentFeeGbp('RETAILER_UNLOCK');
  if (fixedUnlockFeeGbp <= 0) return 0;

  const tender = await prisma.tender.findUniqueOrThrow({
    where: { id: tenderId },
    select: {
      category: true,
      items: { select: { category: true, subcategory: true, item: true, description: true, quantity: true } },
      packages: { select: { category: true, subcategory: true, item: true, description: true, quantity: true } },
    },
  });
  const serviceFeeKey = tenderUsesFixedServiceRelease([
    tender.category,
    ...tender.items.map((item) => item.category),
    ...tender.packages.map((pkg) => pkg.category),
  ]);
  if (serviceFeeKey) return getConfiguredFeeGbp(serviceFeeKey);

  const mode = await getPlatformSetting('RETAILER_UNLOCK_FEE_MODE');
  if (mode !== 'PERCENTAGE') return fixedUnlockFeeGbp;
  const [masterReductionPercentage, baselines] = await Promise.all([
    getQuoteEstimateMasterReductionPercentage(),
    getReviewedQuoteEstimateBaselines(),
  ]);
  const estimatedValueGbp = applyMasterEstimateReduction(
    estimateTenderQuoteValue({
      category: tender.category,
      items: tender.items.length > 0 ? tender.items : tender.packages,
    }, baselines),
    masterReductionPercentage,
  );
  const { lowPercentage, highPercentage, topPercentage } = await getPercentageBandSettings('RETAILER_UNLOCK');
  return calculateTenderUnlockDynamicFeeGbp(estimatedValueGbp, lowPercentage, highPercentage, topPercentage);
}

export async function isAdspaceActive(): Promise<boolean> {
  return await getPlatformSetting('ADSPACE_ACTIVE') === 'true';
}

export async function isIndependentReviewActive(): Promise<boolean> {
  return await getPlatformSetting('INDEPENDENT_REVIEW_ACTIVE') === 'true';
}

export async function isIndependentReviewRenewalActive(): Promise<boolean> {
  return await getPlatformSetting('INDEPENDENT_REVIEW_RENEWAL_ACTIVE') === 'true';
}

export async function getIndependentReviewRenewalFeeGbp(): Promise<number> {
  return getConfiguredFeeGbp('INDEPENDENT_REVIEW_RENEWAL_FEE_GBP');
}

export async function isDirectContactActive(): Promise<boolean> {
  return await getPlatformSetting('DIRECT_CONTACT_ACTIVE') === 'true';
}

/** Owner-controlled: when disabled, a verification request that would need a human decision is declined automatically instead of queuing for review. */
export async function isHumanReviewActive(): Promise<boolean> {
  return await getPlatformSetting('HUMAN_REVIEW_ACTIVE') !== 'false';
}

export type VerificationDocumentRequirementKey = `${string}:${VerificationDocumentType}`;

export function verificationDocumentRequirementKey(service: string, documentType: VerificationDocumentType): VerificationDocumentRequirementKey {
  return `${service}:${documentType}`;
}

export function defaultVerificationDocumentRequirements(): Record<string, boolean> {
  return Object.fromEntries(
    SERVICE_NAMES.flatMap((service) => VERIFICATION_DOCUMENT_TYPES
      .filter((document) => document.appliesTo === 'all' || document.appliesTo.includes(service))
      .map((document) => [verificationDocumentRequirementKey(service, document.type), document.required]))
  );
}

export async function getVerificationDocumentRequirements(): Promise<Record<string, boolean>> {
  const configured = await getPlatformSetting('VERIFICATION_DOCUMENT_REQUIREMENTS');
  let overrides: Record<string, boolean> = {};
  try {
    const parsed = JSON.parse(configured ?? '{}');
    if (parsed && typeof parsed === 'object') overrides = parsed as Record<string, boolean>;
  } catch {
    overrides = {};
  }
  return { ...defaultVerificationDocumentRequirements(), ...overrides };
}

export async function getAdminSettings(includeSupportRecipient = false) {
  const [settings, tiers, subscriptions, categoryDefinitions, verificationDocumentRequirements] = await Promise.all([
    prisma.platformSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.membershipTier.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.categoryDefinition.findMany({ orderBy: [{ service: 'asc' }, { name: 'asc' }] }),
    getVerificationDocumentRequirements(),
  ]);
  return {
    fees: {
      retailerUnlockGbp: Number(settings.find((setting) => setting.key === 'RETAILER_UNLOCK_FEE_GBP')?.value ?? defaultSettings.RETAILER_UNLOCK_FEE_GBP),
      retailerUnlockMode: settings.find((setting) => setting.key === 'RETAILER_UNLOCK_FEE_MODE')?.value ?? defaultSettings.RETAILER_UNLOCK_FEE_MODE,
      retailerUnlockPercentageLow: Number(settings.find((setting) => setting.key === 'RETAILER_UNLOCK_PERCENTAGE_LOW')?.value ?? defaultSettings.RETAILER_UNLOCK_PERCENTAGE_LOW),
      retailerUnlockPercentageHigh: Number(settings.find((setting) => setting.key === 'RETAILER_UNLOCK_PERCENTAGE_HIGH')?.value ?? defaultSettings.RETAILER_UNLOCK_PERCENTAGE_HIGH),
      retailerUnlockPercentageTop: Number(settings.find((setting) => setting.key === 'RETAILER_UNLOCK_PERCENTAGE_TOP')?.value ?? defaultSettings.RETAILER_UNLOCK_PERCENTAGE_TOP),
      contractorServiceUnlockGbp: Number(settings.find((setting) => setting.key === 'CONTRACTOR_SERVICE_UNLOCK_FEE_GBP')?.value ?? defaultSettings.CONTRACTOR_SERVICE_UNLOCK_FEE_GBP),
      professionalServiceUnlockGbp: Number(settings.find((setting) => setting.key === 'PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP')?.value ?? defaultSettings.PROFESSIONAL_SERVICE_UNLOCK_FEE_GBP),
      clientReleaseGbp: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_FEE_GBP')?.value ?? defaultSettings.CLIENT_RELEASE_FEE_GBP),
      clientReleaseMode: settings.find((setting) => setting.key === 'CLIENT_RELEASE_FEE_MODE')?.value ?? defaultSettings.CLIENT_RELEASE_FEE_MODE,
      clientReleasePercentageLow: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_LOW')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_LOW),
      clientReleasePercentageHigh: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_HIGH')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_HIGH),
      clientReleasePercentageTop: Number(settings.find((setting) => setting.key === 'CLIENT_RELEASE_PERCENTAGE_TOP')?.value ?? defaultSettings.CLIENT_RELEASE_PERCENTAGE_TOP),
      quoteEstimateOffsetPercentage: Number(settings.find((setting) => setting.key === 'QUOTE_ESTIMATE_OFFSET_PERCENTAGE')?.value ?? defaultSettings.QUOTE_ESTIMATE_OFFSET_PERCENTAGE),
      quoteEstimateMasterReductionPercentage: Number(settings.find((setting) => setting.key === 'QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE')?.value ?? defaultSettings.QUOTE_ESTIMATE_MASTER_REDUCTION_PERCENTAGE),
      vatPercentage: Number(settings.find((setting) => setting.key === 'VAT_PERCENTAGE')?.value ?? defaultSettings.VAT_PERCENTAGE),
      sponsoredPlacementActive: (settings.find((setting) => setting.key === 'SPONSORED_PLACEMENT_ACTIVE')?.value ?? defaultSettings.SPONSORED_PLACEMENT_ACTIVE) === 'true',
      sponsoredPlacementFeeGbp: Number(settings.find((setting) => setting.key === 'SPONSORED_PLACEMENT_FEE_GBP')?.value ?? defaultSettings.SPONSORED_PLACEMENT_FEE_GBP),
      membershipTiersActive: (settings.find((setting) => setting.key === 'MEMBERSHIP_TIERS_ACTIVE')?.value ?? defaultSettings.MEMBERSHIP_TIERS_ACTIVE) === 'true',
      retailerLaunchCreditsDefault: Number(settings.find((setting) => setting.key === 'RETAILER_LAUNCH_CREDITS_DEFAULT')?.value ?? defaultSettings.RETAILER_LAUNCH_CREDITS_DEFAULT),
      adspaceActive: (settings.find((setting) => setting.key === 'ADSPACE_ACTIVE')?.value ?? defaultSettings.ADSPACE_ACTIVE) === 'true',
      independentReviewActive: (settings.find((setting) => setting.key === 'INDEPENDENT_REVIEW_ACTIVE')?.value ?? defaultSettings.INDEPENDENT_REVIEW_ACTIVE) === 'true',
      independentReviewFeeGbp: Number(settings.find((setting) => setting.key === 'INDEPENDENT_REVIEW_FEE_GBP')?.value ?? defaultSettings.INDEPENDENT_REVIEW_FEE_GBP),
      independentReviewRenewalActive: (settings.find((setting) => setting.key === 'INDEPENDENT_REVIEW_RENEWAL_ACTIVE')?.value ?? defaultSettings.INDEPENDENT_REVIEW_RENEWAL_ACTIVE) === 'true',
      independentReviewRenewalFeeGbp: Number(settings.find((setting) => setting.key === 'INDEPENDENT_REVIEW_RENEWAL_FEE_GBP')?.value ?? defaultSettings.INDEPENDENT_REVIEW_RENEWAL_FEE_GBP),
      directContactActive: (settings.find((setting) => setting.key === 'DIRECT_CONTACT_ACTIVE')?.value ?? defaultSettings.DIRECT_CONTACT_ACTIVE) === 'true',
      directContactFeeGbp: Number(settings.find((setting) => setting.key === 'DIRECT_CONTACT_FEE_GBP')?.value ?? defaultSettings.DIRECT_CONTACT_FEE_GBP),
      humanReviewActive: (settings.find((setting) => setting.key === 'HUMAN_REVIEW_ACTIVE')?.value ?? defaultSettings.HUMAN_REVIEW_ACTIVE) === 'true',
      verificationDocumentRequirements: Object.entries(verificationDocumentRequirements),
    },
    tiers,
    subscriptions,
    categoryDefinitions: categoryDefinitions.map((category) => ({ ...category, items: JSON.parse(category.itemsJson) as string[] })),
    retailerAnalyticsSections: Object.fromEntries(
      RETAILER_ANALYTICS_SECTION_KEYS.map((key) => [key, (settings.find((setting) => setting.key === key)?.value ?? defaultSettings[key]) === 'true'])
    ) as Record<RetailerAnalyticsSectionKey, boolean>,
    ...(includeSupportRecipient ? { supportRecipientEmail: settings.find((setting) => setting.key === 'SUPPORT_RECIPIENT_EMAIL')?.value ?? null } : {}),
  };
}
