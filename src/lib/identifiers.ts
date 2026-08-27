function todayStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function buildTenderReference(date: Date, sequence: number): string {
  return `TND-${todayStamp(date)}-${String(sequence).padStart(6, '0')}`;
}

export function buildQuoteReference(tenderReference: string, sequence: number): string {
  return `${tenderReference}-Q${String(sequence).padStart(2, '0')}`;
}
