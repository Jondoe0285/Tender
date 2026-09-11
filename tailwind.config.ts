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
        'foundation-navy': '#0D1B2A',
        'safety-amber': '#F28C28',
        'steel-blue': '#2F5D7C',
        'trade-blue': '#1D6FB8',
        'site-white': '#FFFFFF',
        'light-grey': '#F2F4F7',
        'sky-blue': '#6EB1E4',
        'hi-viz-tint': '#6EB1E4',
        'concrete-grey': '#6B7280',
        neutral: '#4B5563',
        ink: '#0D1B2A',
        approved: '#1F5F2A',
        attention: '#B23B3B',
        pending: '#8A4B00',
      },
      fontFamily: {
        heading: ['var(--font-montserrat)', 'Arial', 'sans-serif'],
        sans: ['var(--font-source-sans)', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(14,28,46,0.06)',
        'soft-md': '0 4px 12px rgba(14,28,46,0.10)',
        'soft-lg': '0 12px 28px rgba(14,28,46,0.14)',
      },
      borderRadius: {
        card: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
