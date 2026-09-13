export type IndependentReviewTier = 'BRONZE' | 'SILVER' | 'GOLD';

export const INDEPENDENT_REVIEW_TIER_LABELS: Record<IndependentReviewTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
};

export const INDEPENDENT_REVIEW_TIER_DESCRIPTIONS: Record<IndependentReviewTier, string> = {
  BRONZE: 'Bronze means legal requirements such as permits, insurances, and competent advice have been reviewed as evidenced.',
  SILVER: 'Silver means the Provider has met the Bronze criteria and provided sufficient evidence of industry-specific employee and managerial training.',
  GOLD: 'Gold means the Provider has met the Bronze and Silver criteria and has evidenced either a comprehensive management system or validated SSIP membership.',
};

export function independentReviewTierDescription(tier: IndependentReviewTier | null | undefined): string {
  return tier ? INDEPENDENT_REVIEW_TIER_DESCRIPTIONS[tier] : 'Enhanced verification confirms that a Health and Safety professional reviewed the Provider evidence available at the time of review.';
}
