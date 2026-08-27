import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'foundation-navy': '#0E1C2E',
        'safety-amber': '#F5A524',
        'steel-blue': '#1D3D5C',
        'site-white': '#F4F6F8',
        'hi-viz-tint': '#FFD166',
        'concrete-grey': '#8A94A0',
        ink: '#0A0F16',
        approved: '#2E7D32',
        attention: '#B23B3B',
        pending: '#C77D11',
      },
      fontFamily: {
        heading: ['var(--font-archivo)', 'Arial', 'sans-serif'],
        sans: ['var(--font-inter)', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(14,28,46,0.04), 0 4px 16px rgba(14,28,46,0.06)',
        'soft-md': '0 2px 4px rgba(14,28,46,0.05), 0 12px 32px rgba(14,28,46,0.08)',
        'soft-lg': '0 4px 8px rgba(14,28,46,0.06), 0 24px 48px rgba(14,28,46,0.10)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
