/**
 * Converts an exact budget into a coarse band so it can be shown before Retailer unlock
 * without revealing the precise figure (SEC-030/031 — only approved, non-sensitive summary data).
 */
export function estimateValueBand(budgetGbp: number | null): string {
  if (budgetGbp == null) return 'Not specified';
  if (budgetGbp < 500) return 'Under £500';
  if (budgetGbp < 2000) return '£500 - £2,000';
  if (budgetGbp < 10000) return '£2,000 - £10,000';
  if (budgetGbp < 50000) return '£10,000 - £50,000';
  return '£50,000+';
}
