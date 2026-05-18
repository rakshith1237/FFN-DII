/**
 * FFN Design System — Token Exports
 * Source: 09_FFN_Design_System.md
 * Use in: React Email templates, Recharts colours, canvas, non-Tailwind contexts.
 * Tailwind config uses these same values inline for type safety.
 */

export const colors = {
  // Brand
  navy:         '#0F2147',
  accent:       '#3B82F6',
  success:      '#16A34A',
  successLight: '#22C55E',
  amber:        '#D97706',
  amberLight:   '#F59E0B',
  error:        '#DC2626',

  // Neutrals
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  white:   '#FFFFFF',

  // Semantic surfaces
  surfacePage:    '#F9FAFB',
  surfaceCard:    '#FFFFFF',
  surfaceSidebar: '#F9FAFB',
  borderDefault:  '#E5E7EB',
  borderFocus:    '#3B82F6',

  // Chip backgrounds
  chipSuccessBg: '#DCFCE7',
  chipWarningBg: '#FEF3C7',
  chipErrorBg:   '#FEE2E2',
  chipNeutralBg: '#F3F4F6',
  chipBlueBg:    '#DBEAFE',

  // Chip text
  chipSuccessText: '#166534',
  chipWarningText: '#92400E',
  chipErrorText:   '#991B1B',
  chipBlueText:    '#1E40AF',
} as const

export const layout = {
  topNavHeight:    '64px',
  sidebarWidth:    '220px',
  settingsSidebar: '200px',
  contentMaxWidth: '1280px',
  contentPaddingX: '24px',
} as const

export const shadows = {
  card:     '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  dropdown: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  modal:    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  tooltip:  '0 4px 6px -1px rgba(0,0,0,0.1)',
} as const

export const email = {
  headerBg:     '#0F2147',
  headerHeight: '56px',
  maxWidth:     '600px',
  footerBg:     '#F9FAFB',
  footerText:   '#9CA3AF',
  ctaBg:        '#0F2147',
  ctaText:      '#FFFFFF',
  borderColor:  '#E5E7EB',
  altRowBg:     '#F9FAFB',
} as const
