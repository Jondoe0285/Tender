import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('multi-select trigger exposes keyboard-operable combobox semantics', () => {
  const source = readFileSync('src/components/ui/MultiSelectDropdown.tsx', 'utf8');

  assert.match(source, /role="combobox"/);
  assert.match(source, /tabIndex=\{0\}/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /role="listbox"/);
});