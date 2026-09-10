import assert from 'node:assert/strict';
import test from 'node:test';

// Approved brand palette (tailwind.config.ts). Mirrored here as literal hex values so this test
// fails if the approved tokens ever drift without an explicit, reviewed change to both files.
const TOKENS = {
  'foundation-navy': '#0D1B2A',
  'safety-amber': '#F28C28',
  'steel-blue': '#2F5D7C',
  'trade-blue': '#1D6FB8',
  'site-white': '#FFFFFF',
  'light-grey': '#F2F4F7',
  'sky-blue': '#6EB1E4',
  'concrete-grey': '#6B7280',
  approved: '#2E7D32',
  attention: '#B23B3B',
  pending: '#C77D11',
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/** Composites a foreground colour with alpha over an opaque background (used for the bg-{color}/10 tint classes). */
function compositeOverBackground(foregroundHex: string, alpha: number, backgroundHex: string): [number, number, number] {
  const [fr, fg, fb] = hexToRgb(foregroundHex);
  const [br, bg, bb] = hexToRgb(backgroundHex);
  return [fr * alpha + br * (1 - alpha), fg * alpha + bg * (1 - alpha), fb * alpha + bb * (1 - alpha)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio formula (1:1 to 21:1). */
function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexToRgb(hexA));
  const luminanceB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = luminanceA >= luminanceB ? [luminanceA, luminanceB] : [luminanceB, luminanceA];
  return (lighter + 0.05) / (darker + 0.05);
}

function tintContrastRatio(foregroundHex: string, tintAlpha: number, backgroundHex: string): number {
  const luminanceForeground = relativeLuminance(hexToRgb(foregroundHex));
  const luminanceTintedBackground = relativeLuminance(compositeOverBackground(foregroundHex, tintAlpha, backgroundHex));
  const [lighter, darker] = luminanceForeground >= luminanceTintedBackground ? [luminanceForeground, luminanceTintedBackground] : [luminanceTintedBackground, luminanceForeground];
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NORMAL_TEXT = 4.5;
const AA_LARGE_TEXT_OR_UI = 3;

test('primary and danger button text meets AA normal-text contrast against their backgrounds', () => {
  assert.ok(contrastRatio(TOKENS['site-white'], TOKENS['trade-blue']) >= AA_NORMAL_TEXT, 'Button primary: site-white text on trade-blue');
  assert.ok(contrastRatio(TOKENS['site-white'], TOKENS['foundation-navy']) >= AA_NORMAL_TEXT, 'Button primary hover: site-white text on foundation-navy');
  assert.ok(contrastRatio(TOKENS['site-white'], TOKENS.attention) >= AA_NORMAL_TEXT, 'Button danger: site-white text on attention');
});

test('secondary and ghost button text meets AA normal-text contrast against their backgrounds', () => {
  assert.ok(contrastRatio(TOKENS['foundation-navy'], TOKENS['site-white']) >= AA_NORMAL_TEXT, 'Button secondary: foundation-navy text on site-white');
  assert.ok(contrastRatio(TOKENS['concrete-grey'], TOKENS['site-white']) >= AA_NORMAL_TEXT, 'Button ghost: concrete-grey text on site-white');
});

test('attention status badge text-on-tint contrast meets the AA normal-text threshold', () => {
  assert.ok(tintContrastRatio(TOKENS.attention, 0.1, TOKENS['site-white']) >= AA_NORMAL_TEXT, `Attention badge ratio ${tintContrastRatio(TOKENS.attention, 0.1, TOKENS['site-white']).toFixed(2)}:1`);
});

// Confirmed WCAG AA gap (2026-09-10): the pending/approved/neutral badge text colours do not
// reach 4.5:1 against their own tinted background at any tint strength, because the token itself
// is too light against a white surface (e.g. pending vs pure white is only ~3.30:1). Fixing this
// requires darkening an approved functional/status colour, which needs Brand Owner sign-off per
// docs/branding/TradeTender-Brand-Rules.md — an agent must not change it unilaterally. These tests
// pin the current measured ratios so any silent colour change is caught and forces a documented review.
test('known WCAG AA gap: pending status badge falls below the AA normal-text threshold pending Brand Owner review', () => {
  const ratio = tintContrastRatio(TOKENS.pending, 0.1, TOKENS['site-white']);
  assert.ok(ratio < AA_NORMAL_TEXT && ratio > 2.9 && ratio < 3.1, `Expected the known ~2.97:1 gap, measured ${ratio.toFixed(2)}:1`);
});

test('known WCAG AA gap: approved status badge falls below the AA normal-text threshold pending Brand Owner review', () => {
  const ratio = tintContrastRatio(TOKENS.approved, 0.1, TOKENS['site-white']);
  assert.ok(ratio < AA_NORMAL_TEXT && ratio > 4.4 && ratio < 4.6, `Expected the known ~4.49:1 gap, measured ${ratio.toFixed(2)}:1`);
});

test('known WCAG AA gap: neutral status badge falls below the AA normal-text threshold pending Brand Owner review', () => {
  const ratio = tintContrastRatio(TOKENS['concrete-grey'], 0.1, TOKENS['site-white']);
  assert.ok(ratio < AA_NORMAL_TEXT && ratio > 4.1 && ratio < 4.4, `Expected the known ~4.27:1 gap, measured ${ratio.toFixed(2)}:1`);
});

test('the focus-visible ring colour meets the AA non-text UI-component contrast minimum', () => {
  // Button.tsx: focus-visible:ring-trade-blue on focus-visible:ring-offset-site-white.
  assert.ok(contrastRatio(TOKENS['trade-blue'], TOKENS['site-white']) >= AA_LARGE_TEXT_OR_UI, 'Focus ring: trade-blue against its site-white offset');
});

test('white text on the dark foundation-navy surface (footer, dark logo background) meets AA normal-text contrast', () => {
  assert.ok(contrastRatio(TOKENS['site-white'], TOKENS['foundation-navy']) >= AA_NORMAL_TEXT);
});
