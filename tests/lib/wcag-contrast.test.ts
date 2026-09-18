import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  approved: '#1F5F2A',
  attention: '#B23B3B',
  pending: '#8A4B00',
  neutral: '#4B5563',
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

test('status badge tokens are dark enough to satisfy AA contrast against their tint backgrounds', () => {
  const tailwindConfig = readFileSync('tailwind.config.ts', 'utf8');

  assert.match(tailwindConfig, /pending:\s*'#8A4B00'/);
  assert.match(tailwindConfig, /approved:\s*'#1F5F2A'/);
  assert.match(tailwindConfig, /neutral:\s*'#4B5563'/);

  assert.ok(tintContrastRatio('#8A4B00', 0.1, TOKENS['site-white']) >= AA_NORMAL_TEXT, 'Pending badge should clear 4.5:1 on the light tint');
  assert.ok(tintContrastRatio('#1F5F2A', 0.1, TOKENS['site-white']) >= AA_NORMAL_TEXT, 'Approved badge should clear 4.5:1 on the light tint');
  assert.ok(tintContrastRatio('#4B5563', 0.1, TOKENS['site-white']) >= AA_NORMAL_TEXT, 'Neutral badge should clear 4.5:1 on the light tint');
});

test('the focus-visible ring colour meets the AA non-text UI-component contrast minimum', () => {
  // Button.tsx: focus-visible:ring-trade-blue on focus-visible:ring-offset-site-white.
  assert.ok(contrastRatio(TOKENS['trade-blue'], TOKENS['site-white']) >= AA_LARGE_TEXT_OR_UI, 'Focus ring: trade-blue against its site-white offset');
});

test('white text on the dark foundation-navy surface (footer, dark logo background) meets AA normal-text contrast', () => {
  assert.ok(contrastRatio(TOKENS['site-white'], TOKENS['foundation-navy']) >= AA_NORMAL_TEXT);
});
