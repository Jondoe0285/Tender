export function buyingTendersPath(): string {
  return '/user/tenders';
}

export function buyingTenderPath(tenderId: string): string {
  return `/user/tenders/${tenderId}`;
}

export function buyingTenderNewPath(): string {
  return '/user/tenders/new';
}
