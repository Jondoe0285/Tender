import { createHash } from 'node:crypto';

export type PackageSpecPayload = {
  category: string;
  subcategory: string;
  item: string | null;
  quantity: string;
  quantityValue: number | null;
  unit: string | null;
  description: string;
  specJson: string;
  requirements: string;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function hashPackageSpec(payload: PackageSpecPayload): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export function issuedTenderSpecHash(packageHashes: readonly string[]): string {
  if (packageHashes.length === 0) return '';
  return createHash('sha256').update(packageHashes.join('|')).digest('hex');
}

export const STALE_QUOTE_REVISION_MESSAGE = 'This quote is bound to a previous package revision. Ask the supplier to requote against the issued package.';
