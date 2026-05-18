import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/emails/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — matches 09_FFN_Design_System.md exactly
        'brand-navy':          '#0F2147',
        'brand-blue':          '#3B82F6',
        'brand-success':       '#16A34A',
        'brand-success-light': '#22C55E',
        'brand-amber':         '#D97706',
        'brand-amber-light':   '#F59E0B',
        'brand-error':         '#DC2626',

        // Neutrals
        'brand-gray-50':  '#F9FAFB',
        'brand-gray-100': '#F3F4F6',
        'brand-gray-200': '#E5E7EB',
        'brand-gray-300': '#D1D5DB',
        'brand-gray-400': '#9CA3AF',
        'brand-gray-500': '#6B7280',
        'brand-gray-700': '#374151',
        'brand-gray-800': '#1F2937',

        // Semantic surfaces
        'surface-page':    '#F9FAFB',
        'surface-card':    '#FFFFFF',
        'surface-sidebar': '#F9FAFB',
        'border-default':  '#E5E7EB',
        'border-focus':    '#3B82F6',

        // Status chip backgrounds
        'chip-success': '#DCFCE7',
        'chip-warning': '#FEF3C7',
        'chip-error':   '#FEE2E2',
        'chip-neutral': '#F3F4F6',
        'chip-blue':    '#DBEAFE',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'ffn-caption':    ['11px', { lineHeight: '16px' }],
        'ffn-small':      ['12px', { lineHeight: '16px' }],
        'ffn-body-sm':    ['13px', { lineHeight: '20px' }],
        'ffn-body':       ['14px', { lineHeight: '20px' }],
        'ffn-body-lg':    ['15px', { lineHeight: '24px' }],
        'ffn-heading-sm': ['16px', { lineHeight: '24px' }],
        'ffn-heading-md': ['20px', { lineHeight: '28px' }],
      },
      borderRadius: {
        'ffn-chip':  '4px',
        'ffn-input': '6px',
        'ffn-card':  '8px',
      },
      boxShadow: {
        'ffn-card':     '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'ffn-dropdown': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'ffn-modal':    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        'ffn-tooltip':  '0 4px 6px -1px rgba(0,0,0,0.1)',
      },
      transitionDuration: {
        'ffn-hover': '150ms',
        'ffn-entry': '200ms',
        'ffn-modal': '300ms',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
