import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f5f7f6',
        foreground: '#1f2937',
        accent: '#4f8d95',
        card: '#ffffff',
        border: '#d9e0df',
        muted: '#6b7280',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
