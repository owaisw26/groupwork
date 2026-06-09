import { Box, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { Link as RouterLink } from 'react-router-dom'
import { APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
  onActionClick?: () => void
  accent?: string
  footer?: React.ReactNode
}

export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  actionLabel,
  actionTo,
  onActionClick,
  accent = APP_PRIMARY,
  footer,
}: StatCardProps) {
  const isInteractive = Boolean(actionTo || onActionClick)

  const content = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '12px',
            bgcolor: accent === APP_PRIMARY ? APP_PRIMARY_LIGHT : `${accent}18`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: fs(12), fontWeight: 700, color: SLATE[500], mb: 0.25 }}>
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: fs(22), md: fs(26) },
              fontWeight: 800,
              color: SLATE[900],
              lineHeight: 1.15,
            }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
      {subtitle && (
        <Typography sx={{ fontSize: fs(12), color: SLATE[500], mb: 1 }}>
          {subtitle}
        </Typography>
      )}
      {footer}
      {actionLabel && isInteractive && (
        <Typography
          className="stat-card-action"
          component="span"
          sx={{
            mt: 'auto',
            fontSize: fs(13),
            fontWeight: 700,
            color: accent === '#DC2626' ? '#DC2626' : APP_PRIMARY,
          }}
        >
          {actionLabel} →
        </Typography>
      )}
    </>
  )

  const cardSx: SxProps<Theme> = {
    ...SURFACE_CARD_SX,
    p: { xs: 2, md: 2.25 },
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...(isInteractive && {
      cursor: 'pointer',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      '&:hover': {
        borderColor: APP_PRIMARY,
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
      },
      '&:hover .stat-card-action': {
        textDecoration: 'underline',
      },
    }),
  }

  if (actionTo) {
    return (
      <Box component={RouterLink} to={actionTo} sx={cardSx}>
        {content}
      </Box>
    )
  }

  if (onActionClick) {
    return (
      <Box
        component="button"
        type="button"
        onClick={onActionClick}
        sx={{
          ...cardSx,
          width: '100%',
          textAlign: 'left',
          fontFamily: 'inherit',
          appearance: 'none',
        }}
      >
        {content}
      </Box>
    )
  }

  return <Box sx={cardSx}>{content}</Box>
}
