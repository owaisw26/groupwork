import type { SxProps, Theme } from '@mui/material'

export const APP_PRIMARY = '#2563EB'
export const APP_PRIMARY_DARK = '#1D4ED8'
export const APP_PRIMARY_LIGHT = '#EFF6FF'
export const APP_BORDER = '#DDE3EC'
export const APP_BG = '#F8FAFC'

export const SLATE = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
}

export const FONT_STACK =
  '"Atlassian Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/** App UI font sizes are scaled 20% above base pixel values. */
export const fs = (size: number) => Math.round(size * 1.2)

export const PAGE_CARD_SX: SxProps<Theme> = {
  bgcolor: '#FFFFFF',
  border: `1px solid ${APP_BORDER}`,
  borderRadius: '16px',
  boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
}

export const SURFACE_CARD_SX: SxProps<Theme> = {
  ...PAGE_CARD_SX,
  p: { xs: 2.5, md: 3 },
}
