/**
 * Year 1 opportunity strategy: suppliers do not search the Tender table.
 *
 * Matching writes a TenderMatch row at tender create and when a supplying
 * profile changes coverage. The opportunities inbox reads that match index by
 * retailer, restricted to OPEN unexpired tenders, then re-checks coverage in
 * memory. Location/category UI filters run on that bounded set.
 */
export const OPPORTUNITY_MATCH_READ_LIMIT = 200;

export function openOpportunityTenderWhere(now = new Date()) {
  return { status: 'OPEN' as const, closingDate: { gt: now } };
}

export function openMatchedOpportunityWhere(retailerId: string, now = new Date()) {
  return {
    retailerId,
    tender: openOpportunityTenderWhere(now),
  };
}
