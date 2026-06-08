import type { SxProps, Theme } from '@mui/material'

export const PRIMARY = '#2563EB'
export const PRIMARY_DARK = '#1D4ED8'
export const SLATE = {
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
}

export const AUTH_CARD_SX: SxProps<Theme> = {
  width: '100%',
  maxWidth: { xs: 704, lg: 476, xl: 527 },
  p: { xs: '40px 22px', sm: '54px 44px', lg: '46px 43px', xl: '51px 48px' },
  bgcolor: '#FFFFFF',
  border: '1px solid #DDE3EC',
  borderRadius: { xs: '22px', sm: '26px' },
  boxShadow: '0 20px 70px rgba(15, 23, 42, 0.08)',
  minHeight: { xs: 760, sm: 800, lg: 527, xl: 561 },
  display: 'flex',
  flexDirection: 'column',
  transition: 'min-height 220ms ease',
}

export const AUTH_TOGGLE_SX: SxProps<Theme> = {
  mt: 'auto',
  pt: { xs: '28px', lg: '20px' },
  textAlign: 'center',
  color: SLATE[700],
  fontSize: { xs: 17, lg: 13 },
}
