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
        'construction-navy': '#1F2A33',
        'safety-orange': '#F28C28',
        'concrete-grey': '#6B7280',
        'steel-blue': '#2F5D7C',
        'high-vis-yellow': '#F5C542',
        'off-white': '#F7F5F0',
        'success-green': '#2E7D32',
        'warning-amber': '#D97706',
        'error-red': '#B91C1C',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
