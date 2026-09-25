export type IndependentReviewTier = 'BRONZE' | 'SILVER' | 'GOLD';

export const INDEPENDENT_REVIEW_TIERS: IndependentReviewTier[] = ['BRONZE', 'SILVER', 'GOLD'];

export const INDEPENDENT_REVIEW_TIER_RANK: Record<IndependentReviewTier, number> = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
};

export const INDEPENDENT_REVIEW_TIER_LABELS: Record<IndependentReviewTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
};

export function isIndependentReviewTier(value: unknown): value is IndependentReviewTier {
  return value === 'BRONZE' || value === 'SILVER' || value === 'GOLD';
}

export function independentReviewTierRank(tier: IndependentReviewTier | null | undefined): number {
  return tier ? INDEPENDENT_REVIEW_TIER_RANK[tier] : 0;
}

export function independentReviewTierAtMost(awarded: IndependentReviewTier, purchased: IndependentReviewTier): boolean {
  return independentReviewTierRank(awarded) <= independentReviewTierRank(purchased);
}

export function enhancedVerificationProductCode(tier: IndependentReviewTier): string {
  return `ENHANCED_VERIFICATION_${tier}`;
}

export const DEFAULT_INDEPENDENT_REVIEW_FEES_GBP: Record<IndependentReviewTier, number> = {
  BRONZE: 295,
  SILVER: 495,
  GOLD: 695,
};

/** Previous product defaults. Replaced on read when a database row still holds these values. */
export const LEGACY_INDEPENDENT_REVIEW_FEES_GBP: Record<IndependentReviewTier, number> = {
  BRONZE: 150,
  SILVER: 250,
  GOLD: 400,
};

export const INDEPENDENT_REVIEW_TIER_DESCRIPTIONS: Record<IndependentReviewTier, string> = {
  BRONZE: 'Bronze means legal requirements such as permits, insurances, and competent advice have been reviewed as evidenced.',
  SILVER: 'Silver means the Provider has met the Bronze criteria and provided sufficient evidence of industry-specific employee and managerial training.',
  GOLD: 'Gold means the Provider has met the Bronze and Silver criteria and has evidenced either a comprehensive management system or validated SSIP membership.',
};

export function independentReviewTierDescription(tier: IndependentReviewTier | null | undefined): string {
  return tier ? INDEPENDENT_REVIEW_TIER_DESCRIPTIONS[tier] : 'Enhanced verification confirms that a Health and Safety professional reviewed the Provider evidence available at the time of review.';
}
