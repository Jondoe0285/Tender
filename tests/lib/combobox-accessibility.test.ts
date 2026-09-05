import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const comboboxPath = path.join(process.cwd(), 'src/components/ui/Combobox.tsx');

test('combobox exposes the active option to assistive technology', () => {
  const source = readFileSync(comboboxPath, 'utf8');

  assert.match(source, /aria-activedescendant=\{activeOptionId\}/i);
  assert.match(source, /id=\{flatIndex >= 0 \? `\$\{id\}-option-\$\{flatIndex\}` : undefined\}/i);
});
