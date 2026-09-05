import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('completed wizard steps support fast travel while future steps remain unavailable', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/components/ui/Stepper.tsx'), 'utf8');

  assert.ok(source.includes('step.id <= furthestStep'));
  assert.ok(source.includes('onStepClick?.(step.id)'));
  assert.ok(source.includes('step.id !== currentStep'));
});