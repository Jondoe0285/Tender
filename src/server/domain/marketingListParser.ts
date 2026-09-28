import { inflateRawSync } from 'node:zlib';
import { isValidEmail } from '@/lib/email-format';
import { ValidationError } from '@/server/auth/session';

export const MAX_MARKETING_LIST_BYTES = 5 * 1024 * 1024;
export const MAX_MARKETING_RECIPIENTS = 10_000;

export function maskMarketingEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MAX_ZIP_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_ZIP_TOTAL_BYTES = 8 * 1024 * 1024;
const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const XLS_OLE_SIG = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

export type ParsedMarketingList = {
  emails: string[];
  ignoredCells: number;
  fileName: string;
};

export function parseMarketingEmailList(input: { fileName: string; bytes: Buffer }): ParsedMarketingList {
  if (input.bytes.length === 0) throw new ValidationError('The spreadsheet is empty.');
  if (input.bytes.length > MAX_MARKETING_LIST_BYTES) {
    throw new ValidationError('The spreadsheet exceeds the 5 MB upload limit.');
  }

  const fileName = input.fileName.trim();
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xls') || input.bytes.subarray(0, 4).equals(XLS_OLE_SIG)) {
    throw new ValidationError('Save the list as .xlsx or .csv. Older .xls files are not accepted.');
  }

  const cells = lower.endsWith('.csv') || looksLikeCsv(input.bytes)
    ? splitCsvCells(input.bytes.toString('utf8'))
    : lower.endsWith('.xlsx') || isZip(input.bytes)
      ? extractSpreadsheetCells(input.bytes)
      : null;

  if (!cells) {
    throw new ValidationError('Upload an Excel workbook (.xlsx) or a CSV file of email addresses.');
  }

  const unique = new Set<string>();
  let ignoredCells = 0;
  for (const cell of cells) {
    const found = extractEmails(cell);
    if (found.length === 0 && cell.trim().length > 0) ignoredCells += 1;
    for (const email of found) unique.add(email);
  }

  if (unique.size === 0) throw new ValidationError('No email addresses were found in the spreadsheet.');
  if (unique.size > MAX_MARKETING_RECIPIENTS) {
    throw new ValidationError(`The list contains more than ${MAX_MARKETING_RECIPIENTS} email addresses.`);
  }

  return { emails: [...unique], ignoredCells, fileName: fileName.slice(0, 200) };
}

function looksLikeCsv(bytes: Buffer): boolean {
  if (isZip(bytes) || bytes.includes(0)) return false;
  const sample = bytes.subarray(0, 800).toString('utf8');
  return sample.includes('@') && /[,;\t\n]/.test(sample);
}

function isZip(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes.readUInt32LE(0) === LOCAL_SIG;
}

function extractEmails(value: string): string[] {
  const matches = value.match(EMAIL_IN_TEXT) ?? [];
  return matches.map((entry) => entry.trim().toLowerCase()).filter((entry) => isValidEmail(entry));
}

function splitCsvCells(source: string): string[] {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && (character === ',' || character === ';' || character === '\t' || character === '\n' || character === '\r')) {
      cells.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  cells.push(current);
  return cells;
}

function extractSpreadsheetCells(bytes: Buffer): string[] {
  const files = readZipTextFiles(bytes);
  const workbook = files.get('xl/workbook.xml');
  const rels = files.get('xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) throw new ValidationError('The Excel workbook is missing its worksheet index.');

  const sharedStrings = parseSharedStrings(files.get('xl/sharedStrings.xml') ?? '');
  const sheetPaths = worksheetPaths(workbook, rels);
  if (sheetPaths.length === 0) throw new ValidationError('The Excel workbook has no worksheets.');

  const cells: string[] = [];
  for (const sheetPath of sheetPaths) {
    const xml = files.get(sheetPath);
    if (!xml) continue;
    cells.push(...parseSheetCells(xml, sharedStrings));
  }
  return cells;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const blocks = xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g);
  for (const block of blocks) {
    const parts = [...(block[1] ?? '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? ''));
    strings.push(parts.join(''));
  }
  return strings;
}

function parseSheetCells(xml: string, sharedStrings: string[]): string[] {
  const cells: string[] = [];
  const blocks = xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);
  for (const block of blocks) {
    const attributes = block[1] ?? '';
    const inner = block[2] ?? '';
    const type = /(?:\s|^)t="([^"]+)"/.exec(attributes)?.[1] ?? '';
    if (type === 's') {
      const index = Number.parseInt(/<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '', 10);
      if (Number.isInteger(index) && sharedStrings[index]) cells.push(sharedStrings[index]);
      continue;
    }
    if (type === 'inlineStr' || type === 'str') {
      const text = [...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? '')).join('');
      if (text) cells.push(text);
      continue;
    }
    const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    if (value) cells.push(decodeXml(value));
  }
  return cells;
}

function worksheetPaths(workbookXml: string, relsXml: string): string[] {
  const relTargets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = match[0];
    const id = /(?:\s|^)Id="([^"]+)"/.exec(tag)?.[1];
    const target = /(?:\s|^)Target="([^"]+)"/.exec(tag)?.[1];
    if (id && target) relTargets.set(id, target);
  }

  const paths: string[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const id = /r:id="([^"]+)"/.exec(match[0])?.[1];
    if (!id) continue;
    const target = relTargets.get(id);
    if (!target) continue;
    paths.push(resolveZipPath('xl', decodeXml(target)));
  }
  return paths;
}

function resolveZipPath(baseDir: string, target: string): string {
  const normalised = (target.startsWith('/') ? target.slice(1) : `${baseDir}/${target}`).replace(/\\/g, '/');
  const parts: string[] = [];
  for (const part of normalised.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function readZipTextFiles(buffer: Buffer): Map<string, string> {
  const eocd = findEocd(buffer);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  if (cdOffset + cdSize > buffer.length || entryCount > 2_000) {
    throw new ValidationError('The Excel workbook is not a valid spreadsheet.');
  }

  const files = new Map<string, string>();
  let cursor = cdOffset;
  let uncompressedTotal = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_SIG) {
      throw new ValidationError('The Excel workbook is not a valid spreadsheet.');
    }
    const compression = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const flags = buffer.readUInt16LE(cursor + 8);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
    cursor += 46 + nameLength + extraLength + commentLength;

    if ((flags & 0x1) !== 0) throw new ValidationError('Encrypted Excel workbooks are not accepted.');
    if (uncompressedSize > MAX_ZIP_ENTRY_BYTES) throw new ValidationError('The Excel workbook is too large to read.');
    uncompressedTotal += uncompressedSize;
    if (uncompressedTotal > MAX_ZIP_TOTAL_BYTES) throw new ValidationError('The Excel workbook is too large to read.');
    if (!name.startsWith('xl/') || name.includes('..')) continue;
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;

    const contents = readLocalFile(buffer, localOffset, compression, compressedSize, uncompressedSize);
    files.set(name, contents.toString('utf8'));
  }
  return files;
}

function findEocd(buffer: Buffer): number {
  const min = Math.max(0, buffer.length - 22 - 65_535);
  for (let index = buffer.length - 22; index >= min; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD_SIG) return index;
  }
  throw new ValidationError('Upload a valid .xlsx workbook.');
}

function readLocalFile(
  buffer: Buffer,
  localOffset: number,
  compression: number,
  compressedSize: number,
  uncompressedSize: number,
): Buffer {
  if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL_SIG) {
    throw new ValidationError('The Excel workbook is not a valid spreadsheet.');
  }
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + compressedSize;
  if (dataEnd > buffer.length) throw new ValidationError('The Excel workbook is not a valid spreadsheet.');
  const payload = buffer.subarray(dataStart, dataEnd);
  if (compression === 0) return Buffer.from(payload);
  if (compression !== 8) throw new ValidationError('The Excel workbook uses an unsupported compression method.');
  try {
    return inflateRawSync(payload, { maxOutputLength: Math.max(uncompressedSize, 1) });
  } catch {
    throw new ValidationError('The Excel workbook could not be read.');
  }
}
