import { customAlphabet } from 'nanoid';

const clientTradeTenderIdSuffix = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

function todayStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function buildClientTradeTenderId(): string {
  return `TT-CL-${clientTradeTenderIdSuffix()}`;
}

export function buildTenderReference(date: Date, sequence: number): string {
  return `TND-${todayStamp(date)}-${String(sequence).padStart(6, '0')}`;
}

export function buildQuoteReference(tenderReference: string, sequence: number): string {
  return `${tenderReference}-Q${String(sequence).padStart(2, '0')}`;
}
