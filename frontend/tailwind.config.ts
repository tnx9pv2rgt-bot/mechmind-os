import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 🍎 APPLE DESIGN SYSTEM
      colors: {
        // Legacy Apple tokens (used in globals.css utility classes)
        apple: {
          blue: '#2e95ff',
          'blue-hover': '#2680e0',
          dark: '#0d0d0d',
          gray: '#6e6e6e',
          'light-gray': '#f9f9f9',
          border: '#e5e5e5',
          green: '#10a37f',
          red: '#ef4444',
          orange: '#f97316',
          purple: '#a855f7',
        },
        // ChatGPT Design System
        gpt: {
          // Dark mode surfaces
          sidebar: '#171717',
          main: '#212121',
          elevated: '#303030',
          hover: '#2f2f2f',
          'hover-light': '#353535',
          border: 'hsla(0, 0%, 100%, 0.1)',
          // Dark mode text
          'text-primary': '#ececec',
          'text-secondary': '#b4b4b4',
          'text-tertiary': '#8e8e8e',
          // Light mode surfaces
          'sidebar-light': '#f9f9f9',
          'main-light': '#ffffff',
          'hover-light-mode': '#ececec',
          'border-light': '#e5e5e5',
          // Light mode text
          'text-primary-light': '#0d0d0d',
          'text-secondary-light': '#6e6e6e',
          // Accent
          accent: '#7ab7ff',
          green: '#10a37f',
        },
        // Semantic Colors (mapped to ChatGPT tokens)
        background: '#ffffff',
        foreground: '#0d0d0d',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0d0d0d',
        },
        primary: {
          DEFAULT: '#2e95ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f9f9f9',
          foreground: '#0d0d0d',
        },
        muted: {
          DEFAULT: '#f9f9f9',
          foreground: '#6e6e6e',
        },
        accent: {
          DEFAULT: '#2e95ff',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e5e5e5',
        input: '#e5e5e5',
        ring: '#2e95ff',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Apple Dynamic Type Scale
        hero: [
          'clamp(48px, 5vw, 80px)',
          { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' },
        ],
        headline: [
          'clamp(32px, 4vw, 56px)',
          { lineHeight: '1.07', letterSpacing: '-0.022em', fontWeight: '600' },
        ],
        'title-1': [
          'clamp(28px, 3vw, 40px)',
          { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' },
        ],
        'title-2': [
          'clamp(21px, 2vw, 28px)',
          { lineHeight: '1.14', letterSpacing: '-0.022em', fontWeight: '500' },
        ],
        'title-3': [
          'clamp(19px, 1.5vw, 24px)',
          { lineHeight: '1.18', letterSpacing: '-0.022em', fontWeight: '500' },
        ],
        'body-large': ['21px', { lineHeight: '1.38', letterSpacing: '-0.022em' }],
        body: ['17px', { lineHeight: '1.47', letterSpacing: '-0.022em' }],
        callout: ['16px', { lineHeight: '1.44', letterSpacing: '-0.012em' }],
        subhead: ['15px', { lineHeight: '1.33', letterSpacing: '-0.012em' }],
        footnote: ['13px', { lineHeight: '1.38', letterSpacing: '-0.012em' }],
        caption: ['12px', { lineHeight: '1.33', letterSpacing: '0.012em' }],
      },
      spacing: {
        'apple-xs': '6px',
        'apple-sm': '12px',
        apple: '20px',
        'apple-lg': '40px',
        'apple-xl': '80px',
        bento: '12px',
      },
      borderRadius: {
        apple: '20px',
        'apple-lg': '28px',
        pill: '980px',
      },
      boxShadow: {
        apple: '0 4px 16px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 8px 28px rgba(0, 0, 0, 0.12)',
        'apple-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
        card: '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
      maxWidth: {
        apple: '980px',
        'apple-wide': '1200px',
        'apple-narrow': '692px',
      },
      backdropBlur: {
        apple: '20px',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        apple: '300ms',
        'apple-slow': '600ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
