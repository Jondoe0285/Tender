export const UNLOCK_HARVEST_WINDOW_DAYS = 30;
export const UNLOCK_HARVEST_CAP = 8;

export function harvestUnlockCount(
  unlocks: Array<{ tenderId: string }>,
  quotes: Array<{ tenderId: string }>,
): number {
  const quoted = new Set(quotes.map((quote) => quote.tenderId));
  return unlocks.filter((unlock) => !quoted.has(unlock.tenderId)).length;
}

export const HARVEST_CAP_MESSAGE = 'Unlocks without a quote are capped. Quote existing unlocked tenders or wait for the 30-day window to reset.';
