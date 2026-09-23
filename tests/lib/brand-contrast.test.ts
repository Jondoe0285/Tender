import assert from 'node:assert/strict';
import test from 'node:test';

function channel(hex: string) {
  const value = parseInt(hex, 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const normalised = hex.replace('#', '');
  const red = channel(normalised.slice(0, 2));
  const green = channel(normalised.slice(2, 4));
  const blue = channel(normalised.slice(4, 6));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

test('approved brand pairings meet WCAG AA contrast', () => {
  const white = '#FFFFFF';
  const navy = '#0D1B2A';
  const grey = '#6B7280';
  const tradeBlue = '#1D6FB8';
  const amber = '#F28C28';
  const approved = '#1F5F2A';
  const attention = '#B23B3B';
  const pending = '#8A4B00';

  assert.ok(contrastRatio(navy, white) >= 4.5, 'body text on site-white');
  assert.ok(contrastRatio(grey, white) >= 4.5, 'placeholder and secondary text on site-white');
  assert.ok(contrastRatio(tradeBlue, white) >= 3, 'focus ring against site-white');
  assert.ok(contrastRatio(white, tradeBlue) >= 4.5, 'primary button label on trade-blue');
  assert.ok(contrastRatio(navy, amber) >= 4.5, 'mark and warning label on safety-amber');
  assert.ok(contrastRatio(white, navy) >= 4.5, 'inverse text on foundation-navy');
  assert.ok(contrastRatio(approved, white) >= 4.5, 'approved status on site-white');
  assert.ok(contrastRatio(attention, white) >= 4.5, 'attention status on site-white');
  assert.ok(contrastRatio(pending, white) >= 4.5, 'pending status on site-white');
});
