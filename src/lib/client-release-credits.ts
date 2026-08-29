export function normalizeClientReleaseCredits(value: unknown): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error('Client release credits must be a non-negative integer');
  }
  return normalized;
}

export function buildClientOverrideSummary(companyName: string, creditsLeft: number): string {
  return `${companyName} · ${creditsLeft} release credits`;
}
