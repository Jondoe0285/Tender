import { inflateRawSync, inflateSync } from 'node:zlib';
import type { VerificationDocumentType } from '@/lib/verification-documents';
import { verificationDocumentExpires } from '@/lib/verification-documents';

/**
 * Reads PDF text (not a production LLM or OCR service) and checks three facts against the
 * registered profile: company identity, document type, and expiry. Non-PDF files and unread
 * documents fail automated verification. There is no human-review fallback on this path.
 */

export type DocumentAssessmentInput = {
  documentType: VerificationDocumentType;
  mimeType: string;
  content: Buffer;
  expiryDate: Date | null;
  companyName: string;
  companyNumber?: string | null;
  address: string | null;
};

export type DocumentAssessmentResult = {
  confidencePercent: number;
  passed: boolean;
  summary: string;
  matchedCompanyName: boolean;
  matchedAddress: boolean;
  matchedDocumentType: boolean;
  classifiedType: VerificationDocumentType | null;
  extractedExpiryDate: Date | null;
  matchedExpiryDate: boolean | null;
};

const TYPE_PHRASES: Record<VerificationDocumentType, readonly string[]> = {
  CERTIFICATE_OF_INCORPORATION: ['certificate of incorporation', 'companies house', 'incorporated under the companies act', 'company number'],
  PUBLIC_LIABILITY_INSURANCE: ['public liability', 'public liability insurance', 'pl cover'],
  EMPLOYERS_LIABILITY_INSURANCE: ['employers liability', "employer's liability", 'employers liability insurance'],
  WASTE_CARRIERS_LICENCE: ['waste carrier', 'waste carriers', 'waste carriers licence', 'environment agency', 'upper tier', 'lower tier'],
  PROFESSIONAL_QUALIFICATIONS: ['qualification', 'diploma', 'nvq', 'cscs', 'degree certificate'],
  PROFESSIONAL_INDEMNITY_INSURANCE: ['professional indemnity', 'professional indemnity insurance', 'pii'],
  SSIP_ACCREDITATION: ['ssip', 'chas', 'smas', 'safecontractor', 'constructionline'],
  HMRC_UTR_CONFIRMATION: ['unique taxpayer', 'utr', 'hmrc'],
  SA302_TAX_CALCULATION: ['sa302', 'tax calculation', 'self assessment'],
  VAT_REGISTRATION_CERTIFICATE: ['vat registration', 'vat certificate', 'vat number'],
  CIS_REGISTRATION_PROOF: ['construction industry scheme', 'cis registration', 'cis'],
  BUSINESS_BANK_STATEMENT: ['bank statement', 'sort code', 'account number', 'iban'],
  CUSTOMER_INVOICES: ['invoice', 'tax invoice'],
  CUSTOMER_QUOTATIONS_OR_CONTRACTS: ['quotation', 'quote no', 'contract'],
  TRADE_BODY_MEMBERSHIP: ['membership', 'member number', 'trade body'],
  TRADING_ACTIVITY_EVIDENCE: ['www.', 'http', 'website', 'trading as'],
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9./-]+/g, ' ').trim();
}

function significantCompanyTokens(companyName: string): string[] {
  const stopWords = new Set(['ltd', 'limited', 'llp', 'plc', 'the', 'and', 'co', 'company', 'group']);
  return normalise(companyName).replace(/[./-]/g, ' ').split(' ').filter((token) => token.length > 2 && !stopWords.has(token));
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_match, oct: string) => String.fromCharCode(parseInt(oct, 8)));
}

const MAX_CATALOG_WINDOW_BYTES = 512 * 1024;
const MAX_COMPRESSED_STREAM_BYTES = 128 * 1024;
const MAX_INFLATED_STREAM_BYTES = 256 * 1024;
const MAX_STREAMS_TO_INFLATE = 32;
const MAX_EXTRACTED_TEXT_CHARS = 64 * 1024;
const MAX_HEX_STRING_CHARS = 512;
const IMAGE_STREAM_PATTERN = /\/(?:Subtype\s*\/Image|DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)\b/;

function extractPdfStrings(source: string): string {
  const parts: string[] = [];
  const literals = /\((?:\\.|[^\\)])*\)/g;
  for (const match of source.matchAll(literals)) {
    parts.push(decodePdfLiteral(match[0].slice(1, -1)));
  }
  const hexStrings = /<([0-9A-Fa-f \r\n]{4,512})>/g;
  for (const match of source.matchAll(hexStrings)) {
    const hex = match[1].replace(/\s+/g, '');
    if (hex.length < 4 || hex.length % 2 !== 0 || hex.length > MAX_HEX_STRING_CHARS) continue;
    try {
      parts.push(Buffer.from(hex, 'hex').toString('latin1'));
    } catch {
      continue;
    }
  }
  return parts.join(' ');
}

function isPdfDelimiter(byte: number | undefined): boolean {
  if (byte == null || byte <= 32) return true;
  return byte === 37 || byte === 40 || byte === 41 || byte === 47 || byte === 60 || byte === 62 || byte === 91 || byte === 93 || byte === 123 || byte === 125;
}

function trimStreamPayload(bytes: Buffer): Buffer {
  let start = 0;
  let end = bytes.length;
  if (bytes[0] === 0x0d && bytes[1] === 0x0a) start = 2;
  else if (bytes[0] === 0x0a || bytes[0] === 0x0d) start = 1;
  if (end - start >= 2 && bytes[end - 2] === 0x0d && bytes[end - 1] === 0x0a) end -= 2;
  else if (end > start && (bytes[end - 1] === 0x0a || bytes[end - 1] === 0x0d)) end -= 1;
  return bytes.subarray(start, end);
}

function inflatePdfStream(payload: Buffer): string | null {
  if (payload.length === 0 || payload.length > MAX_COMPRESSED_STREAM_BYTES) return null;
  for (const inflate of [inflateSync, inflateRawSync]) {
    try {
      return inflate(payload, { maxOutputLength: MAX_INFLATED_STREAM_BYTES }).toString('latin1');
    } catch {
      continue;
    }
  }
  return null;
}

function printableSnippet(source: string, maxChars: number): string {
  let out = '';
  for (let i = 0; i < source.length && out.length < maxChars; i++) {
    const code = source.charCodeAt(i);
    if (code === 10 || (code >= 32 && code <= 126)) out += source[i];
  }
  return out;
}

function pushExtracted(parts: string[], budget: { remaining: number }, piece: string) {
  if (!piece || budget.remaining <= 0) return;
  const slice = piece.length > budget.remaining ? piece.slice(0, budget.remaining) : piece;
  parts.push(slice);
  budget.remaining -= slice.length;
}

function findNextStreamKeyword(bytes: Buffer, from: number): number {
  const needle = Buffer.from('stream');
  let offset = from;
  while (offset < bytes.length) {
    const index = bytes.indexOf(needle, offset);
    if (index === -1) return -1;
    const after = bytes[index + 6];
    if (isPdfDelimiter(bytes[index - 1]) && (after === 0x0d || after === 0x0a || after === 0x20)) {
      return index;
    }
    offset = index + 1;
  }
  return -1;
}

function streamLooksLikeImage(bytes: Buffer, streamKeywordIndex: number): boolean {
  const dictStart = Math.max(0, streamKeywordIndex - 512);
  return IMAGE_STREAM_PATTERN.test(bytes.subarray(dictStart, streamKeywordIndex).toString('latin1'));
}

export function extractDocumentText(content: Buffer, mimeType: string): string | null {
  if (mimeType !== 'application/pdf') return null;

  const parts: string[] = [];
  const budget = { remaining: MAX_EXTRACTED_TEXT_CHARS };
  const catalog = content.subarray(0, Math.min(content.length, MAX_CATALOG_WINDOW_BYTES)).toString('latin1');
  pushExtracted(parts, budget, extractPdfStrings(catalog));
  pushExtracted(parts, budget, printableSnippet(catalog, 4096));

  const endMarker = Buffer.from('endstream');
  let offset = 0;
  let streams = 0;
  while (budget.remaining > 0 && streams < MAX_STREAMS_TO_INFLATE) {
    const start = findNextStreamKeyword(content, offset);
    if (start === -1) break;
    streams += 1;
    const payloadStart = start + 6;
    const end = content.indexOf(endMarker, payloadStart);
    if (end === -1) break;
    offset = end + endMarker.length;
    if (streamLooksLikeImage(content, start)) continue;
    const inflated = inflatePdfStream(trimStreamPayload(content.subarray(payloadStart, end)));
    if (!inflated) continue;
    pushExtracted(parts, budget, extractPdfStrings(inflated));
    pushExtracted(parts, budget, printableSnippet(inflated, 4096));
  }

  const text = normalise(parts.join(' '));
  return text.length > 0 ? text : null;
}

function scoreDocumentType(text: string): { classifiedType: VerificationDocumentType | null; scores: Partial<Record<VerificationDocumentType, number>> } {
  const scores: Partial<Record<VerificationDocumentType, number>> = {};
  for (const [type, phrases] of Object.entries(TYPE_PHRASES) as Array<[VerificationDocumentType, readonly string[]]>) {
    scores[type] = phrases.reduce((total, phrase) => total + (text.includes(phrase) ? (phrase.split(' ').length > 1 ? 2 : 1) : 0), 0);
  }
  const ranked = (Object.entries(scores) as Array<[VerificationDocumentType, number]>)
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1]);
  return { classifiedType: ranked[0]?.[0] ?? null, scores };
}

function parseUkDate(raw: string): Date | null {
  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const named = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(20\d{2})\b/i);
  if (named) {
    const month = MONTHS[named[2].toLowerCase().replace('.', '')];
    if (month == null) return null;
    const date = new Date(Date.UTC(Number(named[3]), month, Number(named[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dmy = raw.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/);
  if (dmy) {
    const date = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function sameCalendarDay(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

export function extractExpiryDateFromText(text: string): Date | null {
  const windows: string[] = [];
  const labelled = /(?:expir(?:y|es|ing)|valid until|valid to|cover(?:ed)? to|period of insurance|renewal date|end date|cover end)[:\s-]+(.{0,48})/gi;
  for (const match of text.matchAll(labelled)) {
    windows.push(match[0]);
  }
  const sources = windows.length > 0 ? windows : [text];
  const dates: Date[] = [];
  for (const source of sources) {
    const parsed = parseUkDate(source);
    if (parsed) dates.push(parsed);
  }
  if (dates.length === 0) return null;
  return dates.sort((left, right) => right.getTime() - left.getTime())[0];
}

function companyIdentityMatches(text: string, companyName: string, companyNumber?: string | null): boolean {
  const number = companyNumber?.replace(/\s+/g, '').toLowerCase();
  if (number && number.length >= 6 && text.replace(/\s+/g, '').includes(number)) return true;
  const tokens = significantCompanyTokens(companyName);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((token) => text.includes(token));
  return tokens.length <= 2 ? tokens.every((token) => text.includes(token)) : hits.length >= Math.ceil(tokens.length * 0.7);
}

export function assessVerificationDocument(input: DocumentAssessmentInput): DocumentAssessmentResult {
  const now = new Date();
  const expires = verificationDocumentExpires(input.documentType);
  const isPdf = input.mimeType === 'application/pdf';
  let text: string | null = null;
  try {
    text = isPdf ? extractDocumentText(input.content, input.mimeType) : null;
  } catch {
    text = null;
  }

  let confidencePercent = 40;
  const notes: string[] = [];
  let matchedCompanyName = false;
  let matchedAddress = false;
  let matchedDocumentType = false;
  let classifiedType: VerificationDocumentType | null = null;
  let extractedExpiryDate: Date | null = null;
  let matchedExpiryDate: boolean | null = expires ? false : null;

  if (!text) {
    notes.push(isPdf
      ? 'Document text could not be read. Automated verification requires a text PDF.'
      : 'Verification evidence must be a PDF. Photographs and other file types fail.');
    confidencePercent = Math.min(confidencePercent, 40);
  } else {
    const typeScore = scoreDocumentType(text);
    classifiedType = typeScore.classifiedType;
    const declaredScore = typeScore.scores[input.documentType] ?? 0;
    const winnerScore = classifiedType ? (typeScore.scores[classifiedType] ?? 0) : 0;
    matchedDocumentType = declaredScore > 0 && (!classifiedType || classifiedType === input.documentType || declaredScore >= winnerScore);
    notes.push(matchedDocumentType
      ? `Document text matches ${input.documentType.replace(/_/g, ' ').toLowerCase()}.`
      : classifiedType
        ? `Document text looks like ${classifiedType.replace(/_/g, ' ').toLowerCase()}, not ${input.documentType.replace(/_/g, ' ').toLowerCase()}.`
        : `Document text does not identify ${input.documentType.replace(/_/g, ' ').toLowerCase()}.`);
    confidencePercent += matchedDocumentType ? 25 : -20;

    matchedCompanyName = companyIdentityMatches(text, input.companyName, input.companyNumber);
    notes.push(matchedCompanyName
      ? 'Registered company name or company number was found in the document text.'
      : 'Registered company name and company number were not found in the document text.');
    confidencePercent += matchedCompanyName ? 25 : -20;

    if (input.address) {
      const addressTokens = normalise(input.address).replace(/[./-]/g, ' ').split(' ').filter((token) => token.length > 2);
      matchedAddress = addressTokens.length > 0 && addressTokens.some((token) => text.includes(token));
      if (matchedAddress) {
        notes.push('Registered address details were found in the document text.');
        confidencePercent += 5;
      }
    }

    if (expires) {
      extractedExpiryDate = extractExpiryDateFromText(text);
      if (!extractedExpiryDate) {
        notes.push('No expiry date could be read from the document text.');
        confidencePercent -= 15;
      } else if (extractedExpiryDate.getTime() <= now.getTime()) {
        notes.push(`Expiry date read from the document has already passed (${extractedExpiryDate.toISOString().slice(0, 10)}).`);
        confidencePercent = 0;
        matchedExpiryDate = false;
      } else {
        matchedExpiryDate = input.expiryDate ? sameCalendarDay(extractedExpiryDate, input.expiryDate) : true;
        notes.push(matchedExpiryDate
          ? `Expiry date read from the document is ${extractedExpiryDate.toISOString().slice(0, 10)}.`
          : `Expiry date read from the document (${extractedExpiryDate.toISOString().slice(0, 10)}) does not match the date entered (${input.expiryDate?.toISOString().slice(0, 10)}).`);
        confidencePercent += matchedExpiryDate ? 15 : -15;
      }
    } else {
      notes.push('This document type does not expire.');
      confidencePercent += 5;
    }
  }

  confidencePercent = Math.max(0, Math.min(100, confidencePercent));

  const passed = Boolean(text)
    && matchedDocumentType
    && matchedCompanyName
    && (!expires || matchedExpiryDate === true)
    && confidencePercent >= 90;

  const summary = [
    `Automated assessment for ${input.documentType.replace(/_/g, ' ').toLowerCase()}.`,
    ...notes,
    `Confidence score: ${confidencePercent}%.`,
    `Automated verification passed: ${passed ? 'yes' : 'no'}.`,
  ].join(' ');

  return {
    confidencePercent,
    passed,
    summary,
    matchedCompanyName,
    matchedAddress,
    matchedDocumentType,
    classifiedType,
    extractedExpiryDate,
    matchedExpiryDate,
  };
}
