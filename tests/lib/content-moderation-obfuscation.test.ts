import assert from 'node:assert/strict';
import test from 'node:test';
import { moderateContent } from '../../src/server/moderation/contentModeration';

test('detects an obfuscated email address written with [at]/[dot] and word-spelled digits', () => {
  const result = moderateContent([{ name: 'message', value: 'reach me at contact [at] example [dot] com' }]);
  assert.equal(result.containsObfuscation, true);
  assert.equal(result.containsContactInfo, true);
  assert.equal(result.decision, 'BLOCK');
});

test('detects an obfuscated phone number written with spelled-out digits', () => {
  const result = moderateContent([{ name: 'message', value: 'call zero seven one two three four five six seven eight nine' }]);
  assert.equal(result.containsObfuscation, true);
  assert.equal(result.containsContactInfo, true);
});

test('does not flag obfuscation for plain text with no detected contact entities', () => {
  const result = moderateContent([{ name: 'message', value: 'Please confirm the delivery date for this order.' }]);
  assert.equal(result.containsObfuscation, false);
  assert.equal(result.decision, 'ALLOW');
});

test('does not flag obfuscation for a plainly written email address (already readable, not disguised)', () => {
  const result = moderateContent([{ name: 'message', value: 'My email address is test@example.com' }]);
  assert.equal(result.containsContactInfo, true);
  assert.equal(result.containsObfuscation, false);
});
