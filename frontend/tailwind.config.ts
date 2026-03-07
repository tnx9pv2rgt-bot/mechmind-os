import type { Config } from 'tailwindcss'

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
        // Apple Core Colors
        apple: {
          blue: '#0071e3',
          'blue-hover': '#0077ed',
          dark: '#1d1d1f',
          gray: '#86868b',
          'light-gray': '#f5f5f7',
          'border': '#d2d2d7',
          green: '#34c759',
          red: '#ff3b30',
          orange: '#ff9500',
          purple: '#af52de',
        },
        // Semantic Colors
        background: '#f5f5f7',
        foreground: '#1d1d1f',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1d1d1f',
        },
        primary: {
          DEFAULT: '#0071e3',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f5f5f7',
          foreground: '#1d1d1f',
        },
        muted: {
          DEFAULT: '#f5f5f7',
          foreground: '#86868b',
        },
        accent: {
          DEFAULT: '#0071e3',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ff3b30',
          foreground: '#ffffff',
        },
        border: '#d2d2d7',
        input: '#d2d2d7',
        ring: '#0071e3',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        text: ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        // Apple Dynamic Type Scale
        'hero': ['clamp(48px, 5vw, 80px)', { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' }],
        'headline': ['clamp(32px, 4vw, 56px)', { lineHeight: '1.07', letterSpacing: '-0.022em', fontWeight: '600' }],
        'title-1': ['clamp(28px, 3vw, 40px)', { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' }],
        'title-2': ['clamp(21px, 2vw, 28px)', { lineHeight: '1.14', letterSpacing: '-0.022em', fontWeight: '500' }],
        'title-3': ['clamp(19px, 1.5vw, 24px)', { lineHeight: '1.18', letterSpacing: '-0.022em', fontWeight: '500' }],
        'body-large': ['21px', { lineHeight: '1.38', letterSpacing: '-0.022em' }],
        'body': ['17px', { lineHeight: '1.47', letterSpacing: '-0.022em' }],
        'callout': ['16px', { lineHeight: '1.44', letterSpacing: '-0.012em' }],
        'subhead': ['15px', { lineHeight: '1.33', letterSpacing: '-0.012em' }],
        'footnote': ['13px', { lineHeight: '1.38', letterSpacing: '-0.012em' }],
        'caption': ['12px', { lineHeight: '1.33', letterSpacing: '0.012em' }],
      },
      spacing: {
        'apple-xs': '6px',
        'apple-sm': '12px',
        'apple': '20px',
        'apple-lg': '40px',
        'apple-xl': '80px',
        'bento': '12px',
      },
      borderRadius: {
        'apple': '20px',
        'apple-lg': '28px',
        'pill': '980px',
      },
      boxShadow: {
        'apple': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 8px 28px rgba(0, 0, 0, 0.12)',
        'apple-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
      maxWidth: {
        'apple': '980px',
        'apple-wide': '1200px',
        'apple-narrow': '692px',
      },
      backdropBlur: {
        'apple': '20px',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'apple': '300ms',
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
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
