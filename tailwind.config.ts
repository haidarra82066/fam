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
        background: '#f3f7f5',
        foreground: '#1e2b30',
        accent: '#4f8d95',
        card: '#ffffff',
        border: '#d9e0df',
        muted: '#6b7280',
        ink: '#18262b',
        paper: '#fbfcfa',
        sage: {
          50: '#eef7f5',
          100: '#d8e7e3',
          500: '#4f8d95',
          700: '#275f66',
        },
        clay: {
          50: '#fff4f1',
          100: '#f0d9d4',
          600: '#a5574e',
        },
        gold: {
          50: '#fff8e7',
          100: '#f4e3ad',
          700: '#876c24',
        },
      },
      borderRadius: {
        xl: '0.75rem',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(24, 38, 43, 0.06)',
        panel: '0 18px 55px rgba(24, 38, 43, 0.08)',
        float: '0 24px 70px rgba(24, 38, 43, 0.11)',
      },
    },
  },
  plugins: [],
};

export default config;
