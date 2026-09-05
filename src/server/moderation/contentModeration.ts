import { createHash } from 'node:crypto';
import type { ModerationDecision } from '@prisma/client';
import { prisma } from '@/server/data/prisma';

type EntityType = 'EMAIL' | 'PHONE' | 'URL' | 'DOMAIN' | 'SOCIAL_HANDLE' | 'COMPANY' | 'COMPANY_NUMBER' | 'VAT_NUMBER' | 'POSTCODE' | 'ADDRESS_HINT' | 'CONTRACT_REFERENCE' | 'OFF_PLATFORM' | 'QR_REFERENCE';

export type ModerationEntity = { type: EntityType; field: string; reason: string; risk: number };
export type ModerationResult = {
  decision: ModerationDecision;
  riskScore: number;
  containsContactInfo: boolean;
  containsCompanyInfo: boolean;
  containsOffPlatformAttempt: boolean;
  containsObfuscation: boolean;
  reasons: string[];
  entities: ModerationEntity[];
};

export class ContentModerationError extends Error {
  constructor(readonly result: ModerationResult) {
    super('Content cannot be shared through Trade Tender');
    this.name = 'ContentModerationError';
  }
}

const numberWords: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\[(at|dot)\]|\((at|dot)\)|\{(at|dot)\}/g, (_, first: string, second: string, third: string) => first || second || third)
    .replace(/\s+at\s+/g, '@')
    .replace(/\s+dot\s+/g, '.')
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (word) => numberWords[word] ?? word);
}

function addMatch(entities: ModerationEntity[], value: string, field: string, type: EntityType, reason: string, risk: number) {
  if (value) entities.push({ type, field, reason, risk });
}

function findEntities(value: string, field: string): { entities: ModerationEntity[]; wasObfuscated: boolean } {
  const normalized = normalize(value);
  const entities: ModerationEntity[] = [];
  const add = (pattern: RegExp, type: EntityType, reason: string, risk: number) => {
    if (pattern.test(normalized)) addMatch(entities, value, field, type, reason, risk);
  };

  add(/\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i, 'EMAIL', 'Email address detected', 100);
  add(/(?:\+44|0044|0)\s*(?:\(?\d{2,4}\)?[\s.-]*){2,5}\d{2,4}\b/, 'PHONE', 'Phone number detected', 100);
  add(/(?:\+44|0044|0)(?:[\s().-]*\d){9,11}\b/, 'PHONE', 'Phone number detected', 100);
  add(/\b(?:https?:\/\/|www\.)[^\s]+/i, 'URL', 'Website or URL detected', 100);
  add(/\b[a-z0-9-]+\.(?:co\.uk|com|org|net|io|uk)\b/i, 'DOMAIN', 'Website domain detected', 100);
  add(/(?<!\w)@[a-z0-9_.]{3,}\b/i, 'SOCIAL_HANDLE', 'Social media username detected', 90);
  add(/\b(?:zoom|teams|meet|calendly)\b/i, 'OFF_PLATFORM', 'External meeting reference detected', 95);
  add(/\b(?:whatsapp|telegram|signal|facebook|linkedin|instagram|google)\b/i, 'OFF_PLATFORM', 'External messaging or social platform reference detected', 95);
  add(/\b(?:call|text|message|contact|email|phone)\s+(?:me|us|our|the)\b|\b(?:message|contact)\s+(?:privately|directly|offline)\b|\b(?:find|search|look up)\s+(?:us|our|the)\b/i, 'OFF_PLATFORM', 'Request to continue communication outside the platform detected', 100);
  add(/\b(?:qr\s*code|scan\s*(?:this|the)\s*code)\b/i, 'QR_REFERENCE', 'QR code reference detected', 90);
  add(/\b(?:ltd|limited|plc|llp|inc|company\s+number|trading\s+as)\b/i, 'COMPANY', 'Business identifier detected', 65);
  add(/\b(?:company\s*(?:no|number)|crn)\s*[:#]?\s*\d{6,8}\b/i, 'COMPANY_NUMBER', 'Company registration number detected', 70);
  add(/\b(?:gb)?\d{9}(?:\d{3})?\b/i, 'VAT_NUMBER', 'VAT number detected', 70);
  if (field !== 'location') add(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i, 'POSTCODE', 'Postcode detected', 65);
  add(/\b(?:depot|warehouse|yard|branch|industrial estate|unit\s+\d+)\b/i, 'ADDRESS_HINT', 'Business location reference detected', 45);
  add(/\b(?:contract|contract\s*(?:number|no)|purchase\s*order|po\s*(?:number|no)|agreement\s*(?:number|no))\b\s*[:#-]?\s*[a-z0-9/-]{3,}/i, 'CONTRACT_REFERENCE', 'Contract or purchase-order reference detected', 70);

  return { entities, wasObfuscated: normalized !== value.toLowerCase() && entities.length > 0 };
}

export function moderateContent(fields: Array<{ name: string; value: string | undefined | null }>): ModerationResult {
  const entities = fields.flatMap((field) => field.value ? findEntities(field.value, field.name).entities : []);
  const containsObfuscation = fields.some((field) => field.value ? findEntities(field.value, field.name).wasObfuscated : false);
  const riskScore = Math.min(100, Math.max(0, ...entities.map((entity) => entity.risk), 0));
  const decision: ModerationDecision = riskScore >= 90 ? 'BLOCK' : riskScore >= 60 ? 'REVIEW' : riskScore >= 30 ? 'WARN' : 'ALLOW';
  const reasons = [...new Set(entities.map((entity) => `${entity.reason} in ${entity.field}`))];

  return {
    decision,
    riskScore,
    containsContactInfo: entities.some((entity) => ['EMAIL', 'PHONE', 'URL', 'DOMAIN', 'SOCIAL_HANDLE'].includes(entity.type)),
    containsCompanyInfo: entities.some((entity) => ['COMPANY', 'COMPANY_NUMBER', 'VAT_NUMBER', 'POSTCODE', 'ADDRESS_HINT'].includes(entity.type)),
    containsOffPlatformAttempt: entities.some((entity) => ['OFF_PLATFORM', 'QR_REFERENCE'].includes(entity.type)),
    containsObfuscation,
    reasons,
    entities,
  };
}

export async function enforceContentModeration(actorId: string, contentType: string, fields: Array<{ name: string; value: string | undefined | null }>): Promise<ModerationResult> {
  const result = moderateContent(fields);
  const contentHash = createHash('sha256').update(fields.map((field) => `${field.name}:${field.value ?? ''}`).join('\n')).digest('hex');
  await prisma.moderationEvent.create({
    data: {
      actorId,
      contentType,
      contentHash,
      decision: result.decision,
      riskScore: result.riskScore,
      reasons: JSON.stringify(result.reasons),
      entities: JSON.stringify(result.entities.map((entity) => ({ type: entity.type, field: entity.field }))),
    },
  });
  if (result.decision === 'BLOCK' || result.decision === 'REVIEW') throw new ContentModerationError(result);
  return result;
}