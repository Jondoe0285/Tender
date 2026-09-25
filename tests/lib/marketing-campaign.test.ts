import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseMarketingEmailList, maskMarketingEmail } from '../../src/server/domain/marketingListParser';
import { marketingTemplateForKey, tradeTenderMarketingTemplate, tradeTenderSupplierMarketingTemplate } from '../../src/server/notifications/emailTemplates';
import { readUnsubscribeToken, signUnsubscribeToken } from '../../src/server/notifications/marketingUnsubscribe';

const previousSecret = process.env.NEXTAUTH_SECRET;
const previousAppUrl = process.env.NEXTAUTH_URL;
process.env.NEXTAUTH_SECRET = 'marketing-test-secret';
process.env.NEXTAUTH_URL = 'https://tender.example.test';
test.after(() => {
  if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = previousSecret;
  if (previousAppUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = previousAppUrl;
});

test('CSV lists collect unique email addresses from any column', () => {
  const parsed = parseMarketingEmailList({
    fileName: 'consultants.csv',
    bytes: Buffer.from('Name,Email\nAlex,alex@practice.test\nBlair,blair@practice.test\nAlex,alex@practice.test\nNote,not-an-email\n'),
  });
  assert.deepEqual(parsed.emails.sort(), ['alex@practice.test', 'blair@practice.test']);
  assert.equal(parsed.ignoredCells > 0, true);
});

test('xlsx workbooks with inline strings are accepted', () => {
  const bytes = buildStoredZip([
    { name: 'xl/workbook.xml', content: '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: '<worksheet><sheetData><row><c t="inlineStr"><is><t>jordan@consult.test</t></is></c><c t="inlineStr"><is><t>skip this</t></is></c></row></sheetData></worksheet>' },
  ]);
  const parsed = parseMarketingEmailList({ fileName: 'consultants.xlsx', bytes });
  assert.deepEqual(parsed.emails, ['jordan@consult.test']);
});

test('deflated xlsx shared strings are accepted', () => {
  const bytes = buildDeflatedZip([
    { name: 'xl/workbook.xml', content: '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/sharedStrings.xml', content: '<sst><si><t>sam@hub.test</t></si></sst>' },
    { name: 'xl/worksheets/sheet1.xml', content: '<worksheet><sheetData><row><c t="s"><v>0</v></c></row></sheetData></worksheet>' },
  ]);
  const parsed = parseMarketingEmailList({ fileName: 'list.xlsx', bytes });
  assert.deepEqual(parsed.emails, ['sam@hub.test']);
});

test('the Trade Tender marketing template sells the marketplace with landing photography and an unsubscribe link', () => {
  const template = tradeTenderMarketingTemplate({
    unsubscribeUrl: 'https://tender.example.test/unsubscribe/marketing?token=test',
    ctaUrl: 'https://tender.example.test/register',
  });
  assert.equal(template.subject, 'Take the hassle out of sourcing for your next job');
  assert.match(template.html, /Set out the job/);
  assert.match(template.html, /Compare quotes/);
  assert.match(template.html, /Award the work/);
  assert.match(template.html, /prelaunch\/hero\.png/);
  assert.match(template.html, /prelaunch\/specify\.png/);
  assert.match(template.html, /prelaunch\/compare\.png/);
  assert.match(template.html, /prelaunch\/supply\.png/);
  assert.match(template.html, /Stop repeating the job on the phone/);
  assert.match(template.html, /See multiple quotes on the same specification/);
  assert.match(template.html, /Reach firms you have not already got on speed dial/);
  assert.match(template.html, /Run buying and supplying on one path/);
  assert.match(template.html, /Create a Buyer account/);
  assert.match(template.html, /Create a Supplier account/);
  assert.match(template.html, /Create an account/);
  assert.match(template.html, /unsubscribe\/marketing/);
  assert.match(template.html, /Trade_Tender_Candidate_Horizontal_Logo/);
  assert.doesNotMatch(template.html, /HSEQ ConsultHub/);
  assert.doesNotMatch(template.html, /Amazing savings|Revolutionary|Game changing/);
  assert.doesNotMatch(template.html, /operational message from Trade Tender/);
});

test('the Supplier marketing template sells live demand with a written brief before quoting', () => {
  const template = tradeTenderSupplierMarketingTemplate({
    unsubscribeUrl: 'https://tender.example.test/unsubscribe/marketing?token=test',
    ctaUrl: 'https://tender.example.test/register?intent=supplying',
  });
  assert.equal(template.subject, 'Quote live jobs that already have a written brief');
  assert.match(template.html, /See the brief first/);
  assert.match(template.html, /Quote only the jobs that fit/);
  assert.match(template.html, /plant hire companies/);
  assert.match(template.html, /waste handlers/);
  assert.match(template.html, /Genuine opportunities to generate revenue/);
  assert.match(template.html, /Only tender for what interests you/);
  assert.match(template.html, /Scope, location, and requirements before you commit/);
  assert.match(template.html, /register\?intent=supplying/);
  assert.match(template.html, /Create a Supplier account/);
  assert.match(template.html, /prelaunch\/supply\.png/);
  assert.match(template.html, /prelaunch\/specify\.png/);
  assert.match(template.html, /unsubscribe\/marketing/);
  assert.match(template.html, /Trade_Tender_Candidate_Horizontal_Logo/);
  assert.doesNotMatch(template.html, /Take the hassle out of sourcing/);
  assert.doesNotMatch(template.html, /Create a Buyer account/);
  assert.doesNotMatch(template.html, /HSEQ ConsultHub/);
  assert.doesNotMatch(template.html, /Amazing savings|Revolutionary|Game changing/);
});

test('campaign template keys resolve to the Buyer marketplace or Supplier mailshot', () => {
  const input = { unsubscribeUrl: 'https://tender.example.test/unsubscribe/marketing?token=test' };
  assert.equal(marketingTemplateForKey('SUPPLIERS', input).subject, 'Quote live jobs that already have a written brief');
  assert.equal(marketingTemplateForKey('MARKETPLACE', input).subject, 'Take the hassle out of sourcing for your next job');
  assert.equal(marketingTemplateForKey('HSQE_CONSULTHUB', input).subject, 'Take the hassle out of sourcing for your next job');
});

test('unsubscribe tokens round-trip and reject tampering', () => {
  const token = signUnsubscribeToken('Casey@Practice.TEST');
  assert.equal(readUnsubscribeToken(token), 'casey@practice.test');
  assert.equal(readUnsubscribeToken(`${token}x`), null);
  assert.equal(readUnsubscribeToken('not-a-token'), null);
});

test('owner marketing routes stay Owner-gated and discard the spreadsheet after parse', () => {
  const upload = readFileSync('src/app/api/super-user/owner/marketing/campaigns/route.ts', 'utf8');
  const send = readFileSync('src/app/api/super-user/owner/marketing/campaigns/[id]/send/route.ts', 'utf8');
  const preview = readFileSync('src/app/api/super-user/owner/marketing/campaigns/[id]/preview/route.ts', 'utf8');
  const ownerPage = readFileSync('src/app/super-user/owner/page.tsx', 'utf8');
  const panel = readFileSync('src/components/admin/OwnerMarketingPanel.tsx', 'utf8');
  assert.match(upload, /requireOwner/);
  assert.match(send, /requireOwner/);
  assert.match(preview, /requireOwner/);
  assert.match(upload, /parseMarketingEmailList|createMarketingCampaign/);
  assert.doesNotMatch(upload, /writeFile|fs\./);
  assert.match(ownerPage, /OwnerMarketingPanel/);
  assert.match(panel, /confirmLawfulBasis/);
  assert.match(panel, /Excel or CSV/);
  assert.match(panel, /Trade Tender marketing/);
  assert.match(panel, /templateKey/);
  assert.match(panel, /Suppliers/);
  assert.match(panel, /waste handlers/);
  assert.match(upload, /templateKey/);
  assert.doesNotMatch(panel, /HSEQ ConsultHub/);
});

test('marketing emails are masked before they are shown in the Owner card', () => {
  assert.equal(maskMarketingEmail('alex@practice.test'), 'a***@practice.test');
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: Array<{ name: string; content: string }>): Buffer {
  return buildZip(entries.map((entry) => ({ ...entry, compress: false })));
}

function buildDeflatedZip(entries: Array<{ name: string; content: string }>): Buffer {
  return buildZip(entries.map((entry) => ({ ...entry, compress: true })));
}

function buildZip(entries: Array<{ name: string; content: string; compress: boolean }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const uncompressed = Buffer.from(entry.content, 'utf8');
    const payload = entry.compress ? deflateRawSync(uncompressed) : uncompressed;
    const method = entry.compress ? 8 : 0;
    const crc = crc32(uncompressed);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(uncompressed.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    const localFull = Buffer.concat([local, payload]);
    locals.push(localFull);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(uncompressed.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += localFull.length;
  }
  const localPart = Buffer.concat(locals);
  const centralPart = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  return Buffer.concat([localPart, centralPart, eocd]);
}
