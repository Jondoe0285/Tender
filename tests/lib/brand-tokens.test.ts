import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('uses approved brand colour values and action hierarchy', () => {
  const tokens = readFileSync('tailwind.config.ts', 'utf8');
  const button = readFileSync('src/components/ui/Button.tsx', 'utf8');

  assert.match(tokens, /'trade-blue': '#1D6FB8'/);
  assert.match(tokens, /'sky-blue': '#6EB1E4'/);
  assert.match(button, /primary:\s*\n\s*'bg-trade-blue text-site-white/);
  assert.match(button, /secondary:\s*\n\s*'border border-foundation-navy/);
});