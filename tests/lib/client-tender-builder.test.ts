import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pagePath = path.join(process.cwd(), 'src/app/client/tenders/new/page.tsx');

test('Client tender builder collects item quantities and notes during item selection', () => {
  const source = readFileSync(pagePath, 'utf8');

  assert.ok(source.includes("{ id: 2, label: 'Items & Quantities' }"));
  assert.ok(source.includes("{ id: 6, label: 'Review & Submit' }"));
  assert.ok(!source.includes("{ id: 7, label: 'Review & Submit' }"));
  assert.ok(source.includes("{step === 2 && ("));
  assert.ok(source.includes('id="quantity-value"'));
  assert.ok(source.includes('id="description"'));
  assert.ok(source.includes('id={`item-${index}-quantity`}'));
  assert.ok(source.includes('id={`item-${index}-description`}'));
  assert.ok(!source.includes("{step === 4 && (\n          <Card className=\"flex flex-col gap-6\">\n            <h2 className=\"font-heading text-lg font-bold text-foundation-navy\">Materials / Services Required"));
});